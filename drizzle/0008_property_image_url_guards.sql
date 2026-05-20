alter table "properties"
  add constraint "properties_image_no_data_url"
  check ("image" is null or "image" not like 'data:%');

alter table "properties"
  add constraint "properties_images_no_data_url"
  check ("images" is null or "images"::text not like '%data:%');
