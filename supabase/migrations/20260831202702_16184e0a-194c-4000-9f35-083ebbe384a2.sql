create policy "Members can view their own journal screenshots"
on storage.objects for select to authenticated
using (bucket_id = 'journal-shots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Members can upload their own journal screenshots"
on storage.objects for insert to authenticated
with check (bucket_id = 'journal-shots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Members can delete their own journal screenshots"
on storage.objects for delete to authenticated
using (bucket_id = 'journal-shots' and (storage.foldername(name))[1] = auth.uid()::text);