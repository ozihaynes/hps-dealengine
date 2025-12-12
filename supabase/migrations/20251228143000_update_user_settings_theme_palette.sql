-- Expand allowed theme palette to include app theme tokens
alter table user_settings drop constraint if exists user_settings_theme_check;
alter table user_settings
  add constraint user_settings_theme_check
  check (theme in ('system','dark','light','navy','burgundy','green','black','white'));
