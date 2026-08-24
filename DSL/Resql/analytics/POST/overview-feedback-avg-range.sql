WITH rating_config AS (
    SELECT value AS is_five_rating_scale
    FROM configuration
    WHERE key = 'isFiveRatingScale'
      AND "domain" IS NULL
      AND id IN (SELECT max(id) FROM configuration WHERE key = 'isFiveRatingScale' AND "domain" IS NULL)
      AND NOT deleted
),
latest_chats AS (
    SELECT DISTINCT ON (base_id)
        base_id,
        test
    FROM chat
    ORDER BY base_id, updated DESC
),
rated_chats AS (
    SELECT chat.base_id,
        CASE
            WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
            THEN chat.feedback_rating_five
            ELSE chat.feedback_rating
        END AS rating
    FROM chat
    WHERE chat.status = 'ENDED'
      AND chat.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
      AND (
        array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
        OR chat.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
      )
      AND (
        COALESCE(:showTest, FALSE) = TRUE
        OR EXISTS (
            SELECT 1
            FROM latest_chats
            WHERE latest_chats.base_id = chat.base_id
            AND COALESCE(latest_chats.test, FALSE) = FALSE
        )
      )
)
SELECT ROUND(AVG(rating), 2) AS metric_value
FROM rated_chats
WHERE rating IS NOT NULL;
