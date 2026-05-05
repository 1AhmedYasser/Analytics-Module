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
chats_filtered AS (
    SELECT DISTINCT
        base_id,
        first_value(created) OVER (
            PARTITION BY base_id
            ORDER BY updated
        ) AS created,
        CASE
            WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
            THEN last_value(feedback_rating_five) OVER (
                PARTITION BY base_id
                ORDER BY updated
                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
            )
            ELSE last_value(feedback_rating) OVER (
                PARTITION BY base_id
                ORDER BY updated
                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
            )
        END AS feedback_rating_dynamic
    FROM chat
    WHERE (
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
        AND STATUS = 'ENDED'
        AND CASE
            WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
            THEN feedback_rating_five IS NOT NULL
            ELSE feedback_rating IS NOT NULL
        END
        AND ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
        AND (
            (:chat_type = 'buerokratt' AND EXISTS (
                SELECT 1
                FROM message
                WHERE message.chat_base_id = chat.base_id
                AND message.author_role = 'buerokratt'
            ) AND NOT EXISTS (
                SELECT 1
                FROM message
                WHERE message.chat_base_id = chat.base_id
                AND message.author_role = 'backoffice-user'
            ))
            OR
            (:chat_type = 'csa' AND customer_support_id <> ''
                AND EXISTS (
                    SELECT 1
                    FROM message
                    WHERE message.chat_base_id = chat.base_id
                    AND message.author_role = 'backoffice-user'
                )
                AND EXISTS (
                    SELECT 1
                    FROM message
                    WHERE message.chat_base_id = chat.base_id
                    AND message.author_role = 'end-user'
                )
            )
        )
),
all_ended_chats AS (
    SELECT COUNT(DISTINCT base_id) AS total_chats
    FROM chat
    WHERE (
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
      AND STATUS = 'ENDED'
      AND ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
      AND (
            (:chat_type = 'buerokratt' AND EXISTS (
                SELECT 1 FROM message WHERE message.chat_base_id = chat.base_id AND message.author_role = 'buerokratt'
            ) AND NOT EXISTS (
                SELECT 1 FROM message WHERE message.chat_base_id = chat.base_id AND message.author_role = 'backoffice-user'
            ))
            OR
            (:chat_type = 'csa' AND customer_support_id <> ''
                AND EXISTS (
                    SELECT 1 FROM message WHERE message.chat_base_id = chat.base_id AND message.author_role = 'backoffice-user'
                )
                AND EXISTS (
                    SELECT 1 FROM message WHERE message.chat_base_id = chat.base_id AND message.author_role = 'end-user'
                )
            )
      )
),
rating_counts AS (
    SELECT feedback_rating_dynamic AS rating, COUNT(*) AS cnt
    FROM chats_filtered
    GROUP BY feedback_rating_dynamic
),
scale_ratings AS (
    SELECT generate_series AS rating
    FROM (
        SELECT generate_series(
            CASE WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config) THEN 1 ELSE 0 END,
            CASE WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config) THEN 5 ELSE 10 END
        )
    ) s
),
no_feedback_count AS (
    SELECT (SELECT total_chats FROM all_ended_chats) - (SELECT COUNT(*) FROM chats_filtered) AS cnt
),
distribution_with_no_feedback AS (
    SELECT json_agg(elem ORDER BY ord, rating_nullable NULLS LAST) AS distribution
    FROM (
        SELECT 0 AS ord, sr.rating AS rating_nullable, json_build_object('rating', sr.rating, 'count', COALESCE(rc.cnt, 0)) AS elem
        FROM scale_ratings sr
        LEFT JOIN rating_counts rc ON sr.rating = rc.rating
        UNION ALL
        SELECT 1 AS ord, NULL::int AS rating_nullable, json_build_object('rating', '-', 'count', (SELECT cnt FROM no_feedback_count)) AS elem
    ) parts
)
SELECT json_build_object(
    'distribution', (SELECT distribution FROM distribution_with_no_feedback),
    'total_feedback', (SELECT COUNT(*) FROM chats_filtered),
    'total_chats', (SELECT total_chats FROM all_ended_chats),
    'is_five_scale', (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
) AS result;
