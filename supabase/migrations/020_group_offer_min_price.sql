-- Keep the existing JSON key for compatibility with saved course offers.
-- The public group format now starts at 20 000 KZT instead of 30 000 KZT.
create or replace function public.valid_student_offers(offers jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when offers is null then true
    when pg_catalog.jsonb_typeof(offers) <> 'object' then false
    else
      case when offers ? 'selfPacedPriceKzt' then
        case when pg_catalog.jsonb_typeof(offers -> 'selfPacedPriceKzt') = 'number'
          and (offers ->> 'selfPacedPriceKzt') ~ '^[0-9]+$'
          then (offers ->> 'selfPacedPriceKzt')::numeric >= 20000
          else false end
      else true end
      and case when offers ? 'withTeacherPriceKzt' then
        case when pg_catalog.jsonb_typeof(offers -> 'withTeacherPriceKzt') = 'number'
          and (offers ->> 'withTeacherPriceKzt') ~ '^[0-9]+$'
          then (offers ->> 'withTeacherPriceKzt')::numeric >= 50000
          else false end
      else true end
  end;
$$;
