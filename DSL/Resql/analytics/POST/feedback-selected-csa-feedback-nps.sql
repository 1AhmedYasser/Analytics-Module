WITH rating_config AS (
    SELECT value AS is_five_rating_scale
    FROM configuration
    WHERE key = 'isFiveRatingScale'
      AND "domain" IS NULL
      AND id IN (SELECT max(id) FROM configuration WHERE key = 'isFiveRatingScale' AND "domain" IS NULL)
      AND NOT deleted
),
ranked_chats AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY base_id ORDER BY updated DESC) AS rn
    FROM chat
    WHERE (
        array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
            OR chat.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
        ) AND customer_support_id NOT IN ('', 'chatbot')
      AND STATUS = 'ENDED'
      AND CASE
          WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
          THEN feedback_rating_five IS NOT NULL
          ELSE feedback_rating IS NOT NULL
      END
      AND ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
      AND customer_support_id NOT IN (:excluded_csas)
      AND EXISTS (
        SELECT 1
        FROM message
        WHERE message.chat_base_id = chat.base_id
        AND message.author_role = 'end-user'
      )
),
chat_csas AS (
    SELECT base_id,
        created,
        customer_support_id,
        customer_support_display_name,
        CASE
            WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
            THEN feedback_rating_five
            ELSE feedback_rating
        END AS feedback_rating_dynamic
    FROM ranked_chats
    WHERE rn = 1
),
point_nps_by_csa AS (
    SELECT date_trunc(:metric, created)::text AS date_time,
        customer_support_id,
        TRIM(customer_support_display_name) AS customer_support_display_name,
        CASE
            WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config) THEN
                ROUND(100.0 * SUM(CASE WHEN feedback_rating_dynamic IN (4, 5) THEN 1 ELSE 0 END) / NULLIF(COUNT(base_id), 0), 2)
            ELSE
                COALESCE(ROUND(
                    (
                        (SUM(CASE WHEN feedback_rating_dynamic BETWEEN 9 AND 10 THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(base_id), 0))
                        - (SUM(CASE WHEN feedback_rating_dynamic BETWEEN 0 AND 6 THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(base_id), 0))
                    ) * 100,
                    2
                ), 0)
        END AS nps
    FROM chat_csas
    GROUP BY date_time, customer_support_id, customer_support_display_name
),
period_nps_by_csa AS (
    SELECT customer_support_id,
        TRIM(customer_support_display_name) AS customer_support_display_name,
        MAX(CONCAT("user".first_name, ' ', "user".last_name)) AS customer_support_full_name,
        CASE
            WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config) THEN
                ROUND(100.0 * SUM(CASE WHEN feedback_rating_dynamic IN (4, 5) THEN 1 ELSE 0 END) / NULLIF(COUNT(base_id), 0), 2)
            ELSE
                COALESCE(ROUND(
                    (
                        (SUM(CASE WHEN feedback_rating_dynamic BETWEEN 9 AND 10 THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(base_id), 0))
                        - (SUM(CASE WHEN feedback_rating_dynamic BETWEEN 0 AND 6 THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(base_id), 0))
                    ) * 100,
                    2
                ), 0)
        END AS period_nps
    FROM chat_csas
    LEFT JOIN "user" ON "user".id_code = chat_csas.customer_support_id
    GROUP BY customer_support_id, customer_support_display_name
)
SELECT p.date_time,
       p.customer_support_id,
       p.customer_support_display_name,
       t.customer_support_full_name,
       p.nps,
       t.period_nps
FROM point_nps_by_csa p
JOIN period_nps_by_csa t ON p.customer_support_id = t.customer_support_id
ORDER BY p.date_time, p.customer_support_display_name