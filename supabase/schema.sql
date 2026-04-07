-- Ciel's Garden 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요

-- 등급 enum
CREATE TYPE grade AS ENUM ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Ex');
CREATE TYPE growth_stage AS ENUM ('seed', 'sprout', 'growing', 'mature', 'ex');
CREATE TYPE growth_mode AS ENUM ('off', 'stage1', 'stage2');
CREATE TYPE creature_type AS ENUM ('plant', 'animal', 'spirit', 'other');
CREATE TYPE access_role AS ENUM ('owner', 'partner', 'family', 'pet', 'guest');

-- 구역 테이블
CREATE TABLE zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ecosystem_type TEXT NOT NULL DEFAULT '기본',
  climate TEXT,
  auto_feed BOOLEAN DEFAULT true,
  auto_environment BOOLEAN DEFAULT true,
  creature_count INTEGER DEFAULT 0,
  plant_count INTEGER DEFAULT 0,
  color TEXT DEFAULT '#4ade80',
  icon TEXT DEFAULT '🌿',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 동식물 테이블
CREATE TABLE creatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type creature_type NOT NULL DEFAULT 'plant',
  grade grade NOT NULL DEFAULT 'F',
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  growth_stage growth_stage DEFAULT 'seed',
  growth_mode growth_mode DEFAULT 'stage1',
  description TEXT,
  image_url TEXT,
  auto_classified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 부산물/채집품 테이블
CREATE TABLE byproducts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source_creature_id UUID REFERENCES creatures(id) ON DELETE SET NULL,
  source_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  grade grade NOT NULL DEFAULT 'F',
  quantity INTEGER DEFAULT 0,
  category TEXT NOT NULL DEFAULT '기타',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 출입 패스키 테이블
CREATE TABLE access_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  holder_name TEXT NOT NULL,
  role access_role NOT NULL DEFAULT 'guest',
  is_active BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 정원 설정 테이블
CREATE TABLE garden_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 기본 설정 삽입
INSERT INTO garden_settings (key, value, description) VALUES
  ('infinite_growth', 'true', '무한 재배 및 성장 (기본 On)'),
  ('growth_mode', 'stage1', '성장 단계: off/stage1(2배속)/stage2(즉시)'),
  ('pollution_shield', 'true', '오염 방지 마법 상시 발동'),
  ('self_cleaning', 'true', '자가 세척 마법 상시 발동'),
  ('auto_classify', 'true', '동식물 자동 분류 및 구역 분리'),
  ('auto_environment', 'true', '맞춤 환경 자동 제공'),
  ('auto_feed', 'true', '먹이 자동 제공');

-- 기본 구역 삽입
INSERT INTO zones (name, description, ecosystem_type, climate, color, icon) VALUES
  ('세계수 주변', '정원 중앙의 거대한 세계수와 호수 영역', '신성림', '온화', '#22c55e', '🌳'),
  ('호수 구역', '세계수 아래 맑은 호수와 수생 생태계', '수생', '습윤', '#3b82f6', '💧'),
  ('저택 정원', '울타리와 큰 저택 주변 정원', '정원', '온화', '#f59e0b', '🏡'),
  ('약초 밭', '다양한 약초와 허브를 재배하는 구역', '농경', '온화', '#a855f7', '🌿'),
  ('영수 서식지', '영적 존재와 마법 생물의 서식 구역', '마법숲', '변동', '#ef4444', '🦊');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER creatures_updated_at BEFORE UPDATE ON creatures FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER byproducts_updated_at BEFORE UPDATE ON byproducts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER garden_settings_updated_at BEFORE UPDATE ON garden_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 활성화 (필요 시)
-- ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE creatures ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE byproducts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE access_keys ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE garden_settings ENABLE ROW LEVEL SECURITY;
