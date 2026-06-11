WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id) c.*
    FROM chat c
    WHERE c.status = 'ENDED'
      AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY c.base_id, c.updated DESC
)
SELECT
    DATE_TRUNC(:period, lp.ended AT TIME ZONE :timezone) AT TIME ZONE :timezone AS time,
    COUNT(DISTINCT lp.base_id) AS total,
    COUNT(DISTINCT cm_theme.chat_base_id) AS themes,
    COUNT(DISTINCT cm_quality.chat_base_id) AS response_quality,
    COUNT(DISTINCT cm_followup.chat_base_id) AS follow_up
FROM latest_per_base lp
LEFT JOIN LATERAL (
    SELECT chat_base_id
    FROM chat_measurements
    WHERE chat_base_id = lp.base_id::uuid
      AND type = 'THEME'
      AND value IS NOT NULL
      AND value <> ''
    LIMIT 1
) cm_theme ON TRUE
LEFT JOIN LATERAL (
    SELECT chat_base_id
    FROM chat_measurements
    WHERE chat_base_id = lp.base_id::uuid
      AND type = 'QUALITY'
      AND value IS NOT NULL
      AND value <> ''
    LIMIT 1
) cm_quality ON TRUE
LEFT JOIN LATERAL (
    SELECT chat_base_id
    FROM chat_measurements
    WHERE chat_base_id = lp.base_id::uuid
      AND type = 'FOLLOW_UP_ACTION'
      AND value IS NOT NULL
      AND value <> ''
    LIMIT 1
) cm_followup ON TRUE
WHERE (:showTest = TRUE OR lp.test = FALSE)
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
    OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
  )
GROUP BY time
ORDER BY time ASC;
