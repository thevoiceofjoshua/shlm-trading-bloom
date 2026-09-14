CREATE FUNCTION public.__migrate_exec(sql text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN EXECUTE sql; END; $$;
REVOKE ALL ON FUNCTION public.__migrate_exec(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.__migrate_exec(text) TO service_role;