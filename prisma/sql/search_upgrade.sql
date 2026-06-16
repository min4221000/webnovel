-- =====================================================================
-- (선택) 통합검색 성능 업그레이드: tsvector + GIN 인덱스 + 자동 갱신 트리거
-- =====================================================================
-- 기본 검색 API(/api/search)는 ILIKE(부분일치)로 동작하므로 이 파일 없이도 검색됨.
-- 데이터가 많아져 ILIKE가 느려지면 아래를 DB에 적용해 GIN 인덱스 검색으로 전환.
--
-- 적용:  psql "$DATABASE_URL" -f prisma/sql/search_upgrade.sql
--
-- 주의: Postgres 'simple' config는 한글 형태소 분석을 안 하므로 공백 단위 토큰만
--       매칭됨(부분어절 검색엔 ILIKE가 더 유리). 한국어 형태소가 필요하면
--       별도 확장(예: pg_bigm, zhparser/mecab) 설치 후 config를 교체할 것.
-- =====================================================================

-- ---- Novel ----
CREATE INDEX IF NOT EXISTS novel_search_idx
  ON "Novel" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION novel_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.tags, '{}'), ' ')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS novel_search_update ON "Novel";
CREATE TRIGGER novel_search_update
  BEFORE INSERT OR UPDATE OF title, description, tags ON "Novel"
  FOR EACH ROW EXECUTE FUNCTION novel_search_trigger();

-- 기존 행 백필
UPDATE "Novel" SET title = title;

-- ---- Chapter ----
CREATE INDEX IF NOT EXISTS chapter_search_idx
  ON "Chapter" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION chapter_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(regexp_replace(NEW.content, '<[^>]+>', ' ', 'g'), '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chapter_search_update ON "Chapter";
CREATE TRIGGER chapter_search_update
  BEFORE INSERT OR UPDATE OF title, content ON "Chapter"
  FOR EACH ROW EXECUTE FUNCTION chapter_search_trigger();

-- 기존 행 백필
UPDATE "Chapter" SET title = title;
