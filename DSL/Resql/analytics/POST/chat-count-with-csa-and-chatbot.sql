WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id)
    DATE_TRUNC(:period, c.ended AT TIME ZONE :timezone) AT TIME ZONE :timezone AS time,
    c.base_id,
    c.test,
    c.end_user_url,
    c.ended,
    c.updated
FROM chat c
WHERE c.status = 'ENDED'
  AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
  ORDER BY c.base_id, c.updated DESC
),
csa_ids AS (
  SELECT DISTINCT time, base_id
  FROM latest_per_base b
  WHERE EXISTS (
    SELECT 1 FROM message m
    WHERE m.chat_base_id = b.base_id
      AND m.author_role = 'backoffice-user'
  )
  AND EXISTS (
    SELECT 1 FROM message m
    WHERE m.chat_base_id = b.base_id
      AND (m.event = 'taken-over' or m.event = 'pending-assigned')
  )
  AND (
    :showTest = TRUE
    OR b.test = FALSE
  )
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
    OR b.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
  )
),
chatbot_ids AS (
  SELECT DISTINCT time, base_id
  FROM latest_per_base b
  WHERE NOT EXISTS (
    SELECT 1 FROM csa_ids c
    WHERE c.base_id = b.base_id
  )
  AND (
    :showTest = TRUE
    OR b.test = FALSE
  )
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
    OR b.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
  )
),
combined AS (
  SELECT time, base_id FROM chatbot_ids
  UNION
  SELECT time, base_id FROM csa_ids
)
SELECT time, COUNT(*) AS sum_count
FROM combined
GROUP BY time
ORDER BY time ASC;
