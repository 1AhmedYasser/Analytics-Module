WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id) c.*
FROM chat c
WHERE c.status = 'ENDED'
  AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY c.base_id, c.updated DESC
)
SELECT
    DATE_TRUNC(:period, lp.ended AT TIME ZONE :timezone) AT TIME ZONE :timezone AS time,
    COUNT(*) AS count
FROM latest_per_base lp
WHERE (:showTest = TRUE OR lp.test = FALSE)
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
   OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
    )
  AND EXISTS (
    SELECT 1
    FROM message m
    WHERE m.chat_base_id = lp.base_id
      AND m.author_role = 'backoffice-user'
  )
  AND EXISTS (
    SELECT 1
    FROM message m
    WHERE m.chat_base_id = lp.base_id
      AND (m.event = 'taken-over' OR m.event = 'pending-assigned')
  )
GROUP BY time
ORDER BY time ASC;
