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
chat_buerokratt AS (
    SELECT DISTINCT base_id,
        first_value(ended) OVER (
            PARTITION BY base_id
            ORDER BY updated
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS ended,
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
        AND EXISTS (
        SELECT 1
        FROM message
        WHERE message.chat_base_id = chat.base_id
          AND message.author_role = 'buerokratt'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM message
        WHERE message.chat_base_id = chat.base_id
          AND message.author_role = 'backoffice-user'
    )
    AND status = 'ENDED'
    AND CASE
        WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
        THEN feedback_rating_five IS NOT NULL
        ELSE feedback_rating IS NOT NULL
    END
    AND ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
),
point_nps AS (
    SELECT date_trunc(:metric, ended)::text AS date_time,
           CASE
               WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config) THEN
                   ROUND(
                       100.0 * SUM(CASE WHEN feedback_rating_dynamic IN (4, 5) THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(feedback_rating_dynamic), 0),
                       2
                   )
               ELSE
                   COALESCE(ROUND(
                       (
                           (SUM(CASE WHEN feedback_rating_dynamic BETWEEN 9 AND 10 THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(feedback_rating_dynamic), 0))
                           - (SUM(CASE WHEN feedback_rating_dynamic BETWEEN 0 AND 6 THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(feedback_rating_dynamic), 0))
                       ) * 100,
                       2
                   ), 0)
           END AS nps
    FROM chat_buerokratt
    GROUP BY date_time
    ORDER BY date_time
),
period_nps AS (
    SELECT CASE
               WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config) THEN
                   ROUND(
                       100.0 * SUM(CASE WHEN feedback_rating_dynamic IN (4, 5) THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(feedback_rating_dynamic), 0),
                       2
                   )
               ELSE
                   COALESCE(ROUND(
                       (
                           (SUM(CASE WHEN feedback_rating_dynamic BETWEEN 9 AND 10 THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(feedback_rating_dynamic), 0))
                           - (SUM(CASE WHEN feedback_rating_dynamic BETWEEN 0 AND 6 THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(feedback_rating_dynamic), 0))
                       ) * 100,
                       2
                   ), 0)
           END AS nps
    FROM chat_buerokratt
),
is_five AS (
    SELECT COALESCE(is_five_rating_scale, 'false') = 'true' AS is_five_scale FROM rating_config
)
SELECT json_build_object(
    'pointNps', (SELECT json_agg(json_build_object('dateTime', date_time, 'nps', nps)) FROM point_nps),
    'periodNps', (SELECT nps FROM period_nps),
    'isFiveScale', (SELECT is_five_scale FROM is_five)
) AS result
