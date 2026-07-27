import { Slot } from 'expo-router';
import { AssignmentsProvider } from '../../src/context/AssignmentsContext';

export default function AssignmentsRouteLayout() {
  return (
    <AssignmentsProvider>
      <Slot />
    </AssignmentsProvider>
  );
}
