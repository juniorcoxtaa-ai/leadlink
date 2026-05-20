update properties
set image = null
where image is not null
and trim(image) like 'data:%';

update properties
set images = null
where images is not null
and images::text like '%data:%';

alter table "properties"
  add constraint "properties_image_no_data_url"
  check ("image" is null or "image" not like 'data:%');

alter table "properties"
  add constraint "properties_images_no_data_url"
  check ("images" is null or "images"::text not like '%data:%');