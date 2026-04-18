insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

create policy "Public access to profile images"
on storage.objects for select
using (bucket_id = 'profile-images');

create policy "Authenticated users can upload profile images"
on storage.objects for insert
with check (
  bucket_id = 'profile-images'
  and auth.role() = 'authenticated'
);

create policy "Users can update their own profile images"
on storage.objects for update
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own profile images"
on storage.objects for delete
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
