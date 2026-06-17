WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id) c.*
    FROM chat c
    WHERE c.status = 'ENDED'
      AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY c.base_id, c.updated DESC
),
latest_action_times AS (
    SELECT chat_base_id, MAX(created_at) AS latest_at
    FROM chat_measurements
    WHERE type = 'FOLLOW_UP_ACTION'
    GROUP BY chat_base_id
),
current_actions AS (
    SELECT cm.*
    FROM chat_measurements cm
    JOIN latest_action_times lat ON cm.chat_base_id = lat.chat_base_id
        AND cm.created_at = lat.latest_at
    WHERE cm.type = 'FOLLOW_UP_ACTION'
)
SELECT
    cm.value AS follow_up_action,
    COUNT(DISTINCT lp.base_id) AS count
FROM latest_per_base lp
JOIN current_actions cm ON cm.chat_base_id = lp.base_id::uuid
WHERE (:showTest = TRUE OR lp.test = FALSE)
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
    OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
  )
  AND cm.value IS NOT NULL
  AND cm.value <> ''
  AND cm.value NOT IN (:excluded_actions)
GROUP BY cm.value
ORDER BY count DESC, cm.value ASC;
