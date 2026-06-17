WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id) c.*
    FROM chat c
    WHERE c.status = 'ENDED'
      AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY c.base_id, c.updated DESC
),
buerokratt_base_ids AS (
    SELECT lp.base_id
    FROM latest_per_base lp
    WHERE (:showTest = TRUE OR lp.test = FALSE)
      AND (
        array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
        OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
      )
      AND NOT EXISTS (
        SELECT 1 FROM message m
        WHERE m.chat_base_id = lp.base_id
          AND m.author_role = 'backoffice-user'
      )
      AND NOT EXISTS (
        SELECT 1 FROM message m
        WHERE m.chat_base_id = lp.base_id
          AND (m.event = 'taken-over' OR m.event = 'pending-assigned')
      )
)
SELECT
    COUNT(DISTINCT lp.base_id) AS total_chats,
    COUNT(DISTINCT cm_theme.chat_base_id) AS chats_with_themes,
    (SELECT COUNT(*) FROM buerokratt_base_ids) AS total_buerokratt_chats,
    COUNT(DISTINCT CASE WHEN bb.base_id IS NOT NULL THEN cm_quality.chat_base_id END) AS buerokratt_chats_with_quality,
    COUNT(DISTINCT cm_followup.chat_base_id) AS chats_with_follow_up
FROM latest_per_base lp
LEFT JOIN buerokratt_base_ids bb ON bb.base_id = lp.base_id
LEFT JOIN LATERAL (
    SELECT chat_base_id
    FROM chat_measurements
    WHERE chat_base_id = lp.base_id::uuid
      AND type = 'THEME'
      AND created_at = (
          SELECT MAX(created_at) FROM chat_measurements
          WHERE chat_base_id = lp.base_id::uuid AND type = 'THEME'
      )
      AND value IS NOT NULL
      AND value <> ''
    LIMIT 1
) cm_theme ON TRUE
LEFT JOIN LATERAL (
    SELECT chat_base_id
    FROM chat_measurements
    WHERE chat_base_id = lp.base_id::uuid
      AND type = 'QUALITY'
      AND created_at = (
          SELECT MAX(created_at) FROM chat_measurements
          WHERE chat_base_id = lp.base_id::uuid AND type = 'QUALITY'
      )
      AND value IS NOT NULL
      AND value <> ''
    LIMIT 1
) cm_quality ON TRUE
LEFT JOIN LATERAL (
    SELECT chat_base_id
    FROM chat_measurements
    WHERE chat_base_id = lp.base_id::uuid
      AND type = 'FOLLOW_UP_ACTION'
      AND created_at = (
          SELECT MAX(created_at) FROM chat_measurements
          WHERE chat_base_id = lp.base_id::uuid AND type = 'FOLLOW_UP_ACTION'
      )
      AND value IS NOT NULL
      AND value <> ''
    LIMIT 1
) cm_followup ON TRUE
WHERE (:showTest = TRUE OR lp.test = FALSE)
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
    OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
  );
