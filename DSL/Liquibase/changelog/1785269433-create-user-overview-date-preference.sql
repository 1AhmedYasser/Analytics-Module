-- liquibase formatted sql
-- changeset 1AhmedYasser:1785269433
CREATE TABLE public."user_overview_date_preference" (
    user_id_code VARCHAR(50) NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'week',
    CONSTRAINT user_overview_date_preference_pkey PRIMARY KEY (user_id_code),
    CONSTRAINT user_overview_date_preference_unit_check CHECK (unit IN ('day', 'week', 'month', 'period'))
);
