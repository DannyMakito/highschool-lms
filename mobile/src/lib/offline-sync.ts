import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

const QUEUE_KEY = '@offline_sync_queue';

interface SyncAction {
  id: string;
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
}

export class OfflineSyncService {
  private static _processing = false;
  /**
   * Initializes the network listener to process queue when internet is back.
   */
  static init() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });
  }

  /**
   * Adds an action to the offline queue.
   */
  static async enqueueAction(action: Omit<SyncAction, 'id' | 'timestamp'>) {
    try {
      const queue = await this.getQueue();
      const newAction: SyncAction = {
        ...action,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      
      queue.push(newAction);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      console.log('Action queued offline:', newAction);
    } catch (e) {
      console.error('Failed to enqueue action', e);
    }
  }

  /**
   * Retrieves the current queue.
   */
  static async getQueue(): Promise<SyncAction[]> {
    try {
      const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueStr) {
        return JSON.parse(queueStr);
      }
    } catch (e) {
      console.error('Failed to get offline queue', e);
    }
    return [];
  }

  /**
   * Processes all queued actions and sends them to Supabase.
   */
  static async processQueue() {
    if (this._processing) {
      console.log('processQueue already running, skipping concurrent run');
      return;
    }
    this._processing = true;

    const queue = await this.getQueue();
    if (queue.length === 0) {
      this._processing = false;
      return;
    }

    console.log(`Processing offline queue of ${queue.length} items...`);

    const remainingQueue: SyncAction[] = [];

    for (const action of queue) {
      try {
        let error = null;
        
        switch (action.type) {
          case 'INSERT':
            const { error: insertErr } = await supabase.from(action.table).insert(action.payload);
            error = insertErr;
            break;
          case 'UPDATE':
            // Assuming payload includes the ID to update
            const { id, ...updateData } = action.payload;
            const { error: updateErr } = await supabase.from(action.table).update(updateData).eq('id', id);
            error = updateErr;
            break;
          case 'DELETE':
            const { error: deleteErr } = await supabase.from(action.table).delete().eq('id', action.payload.id);
            error = deleteErr;
            break;
        }

        if (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          // Keep in queue if it failed due to server error or network issue
          // A robust app might distinguish between validation errors and network errors
          remainingQueue.push(action);
        } else {
          console.log(`Successfully synced action ${action.id}`);
        }
      } catch (e) {
        console.error(`Error processing action ${action.id}:`, e);
        remainingQueue.push(action);
      }
    }

    try {
      // Merge any items that were added while we were processing
      const currentPersisted = await this.getQueue();
      const merged = [
        ...remainingQueue,
        ...currentPersisted.filter(c => !remainingQueue.some(r => r.id === c.id)),
      ];
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(merged));
    } finally {
      this._processing = false;
    }
  }
}
