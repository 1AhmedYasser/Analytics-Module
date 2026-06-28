-- liquibase formatted sql
-- changeset 1AhmedYasser:1782650770
INSERT INTO user_overview_metric_preference (user_id_code, metric, ordinality, active)
SELECT
    "user".id_code,
    new_metric.metric,
    100 + ROW_NUMBER() OVER (PARTITION BY "user".id_code ORDER BY new_metric.metric::text),
    TRUE
FROM "user"
CROSS JOIN unnest(ARRAY[
    'total_chats',
    'avg_waiting_time',
    'avg_rating',
    'burokratt_rate',
    'csa_rate',
    'redirected_rate',
    'left_without_answer_rate',
    'chart',
    'positive_feedback',
    'quality',
    'themes',
    'follow_up'
]::overview_metric[]) AS new_metric(metric)
WHERE NOT EXISTS (
    SELECT 1
    FROM user_overview_metric_preference p
    WHERE p.user_id_code = "user".id_code
      AND p.metric = new_metric.metric
);
