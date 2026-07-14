-- liquibase formatted sql
-- changeset 1AhmedYasser:1782650769
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'total_chats';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'avg_waiting_time';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'avg_rating';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'burokratt_rate';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'csa_rate';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'redirected_rate';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'left_without_answer_rate';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'chart';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'positive_feedback';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'quality';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'themes';
ALTER TYPE overview_metric ADD VALUE IF NOT EXISTS 'follow_up';
