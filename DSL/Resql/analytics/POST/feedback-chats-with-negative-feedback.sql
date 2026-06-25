WITH rating_config AS (
    SELECT value AS is_five_rating_scale
    FROM configuration
    WHERE key = 'isFiveRatingScale'
      AND "domain" IS NULL
      AND id IN (SELECT max(id) FROM configuration WHERE key = 'isFiveRatingScale' AND "domain" IS NULL)
      AND NOT deleted
),
MaxChatHistoryComments AS (
    SELECT MAX(id) AS maxId
    FROM chat_history_comments
    GROUP BY chat_id
),
ChatHistoryComments AS (
    SELECT
        chc.comment,
        chc.chat_id,
        chc.created,
        chc.author_display_name
    FROM chat_history_comments chc
    JOIN MaxChatHistoryComments m ON chc.id = m.maxId
),
n_chats AS (
    SELECT
        base_id,
        MAX(created) AS created
    FROM chat
    WHERE STATUS = 'ENDED'
      AND ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
      AND CASE 
          WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config) 
          THEN feedback_rating_five IS NOT NULL AND feedback_rating_five <= 3
          ELSE feedback_rating IS NOT NULL AND feedback_rating <= 5
      END
    GROUP BY base_id
),
c_chat AS (
    SELECT
        base_id,
        MIN(created) AS created,
        MAX(ended) AS ended
    FROM chat
    GROUP BY base_id
),
deduplicated_users AS (
    SELECT
        id_code,
        first_name,
        last_name
    FROM (
        SELECT
            id_code,
            first_name,
            last_name,
            ROW_NUMBER() OVER (PARTITION BY id_code ORDER BY first_name, last_name) AS row_num
        FROM "user"
    ) ranked_users
    WHERE row_num = 1
),
ChatUser AS (
    SELECT DISTINCT ON (id_code)
        id_code,
        display_name,
        first_name,
        last_name
    FROM "user"
    ORDER BY id_code, id DESC
),
LatestOpenChat AS (
    SELECT DISTINCT ON (base_id)
        base_id,
        customer_support_id AS latest_open_csa
    FROM chat
    WHERE status = 'OPEN'
    ORDER BY base_id, id DESC
),
CSAFullNames AS (
    SELECT
        c2.base_id,
        ARRAY_AGG(DISTINCT TRIM(
            CASE
                WHEN c2.customer_support_id = 'chatbot' THEN c2.customer_support_display_name
                ELSE COALESCE(NULLIF(TRIM(cu.first_name || ' ' || cu.last_name), ''), cu.display_name)
            END
        )) FILTER (
            WHERE NOT (
                c2.customer_support_id = 'chatbot'
                AND (lo.latest_open_csa IS NULL OR lo.latest_open_csa <> 'chatbot')
            )
        ) AS all_csa_names,
        ARRAY_AGG(DISTINCT c2.customer_support_id) FILTER (
            WHERE NOT (
                c2.customer_support_id = 'chatbot'
                AND (lo.latest_open_csa IS NULL OR lo.latest_open_csa <> 'chatbot')
            )
        ) AS all_csa_ids
    FROM chat c2
    LEFT JOIN ChatUser cu ON cu.id_code = c2.customer_support_id
    LEFT JOIN LatestOpenChat lo ON lo.base_id = c2.base_id
    GROUP BY c2.base_id
)
SELECT
    n_chats.base_id,
    c_chat.created,
    c_chat.ended,
    CASE 
        WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config) 
        THEN chat.feedback_rating_five
        ELSE chat.feedback_rating
    END AS rating,
    chat.feedback_text,
    deduplicated_users.first_name AS first_name,
    deduplicated_users.last_name AS last_name,
    chc.comment AS comment,
    CSAFullNames.all_csa_names AS all_csa_names,
    CEIL(COUNT(*) OVER() / :page_size::DECIMAL) AS total_pages
FROM n_chats
LEFT JOIN chat ON n_chats.base_id = chat.base_id
LEFT JOIN c_chat ON c_chat.base_id = chat.base_id AND n_chats.created = chat.created
LEFT JOIN deduplicated_users ON chat.customer_support_id = deduplicated_users.id_code
LEFT JOIN ChatHistoryComments chc ON chat.base_id = chc.chat_id
LEFT JOIN CSAFullNames ON CSAFullNames.base_id = chat.base_id
CROSS JOIN rating_config rc
WHERE (
    LENGTH(:customerSupportIds) = 0 OR
    chat.customer_support_id = ANY(string_to_array(:customerSupportIds, ','))
) 
AND (
    CASE 
        WHEN rc.is_five_rating_scale = 'true' 
        THEN chat.feedback_rating_five IS NOT NULL
        ELSE chat.feedback_rating IS NOT NULL
    END
)
AND chat.ended IS NOT NULL
ORDER BY
    CASE WHEN :sorting = 'created desc' THEN n_chats.created END DESC,
    CASE WHEN :sorting = 'created asc' THEN n_chats.created END ASC,
    CASE WHEN :sorting = 'ended desc' THEN n_chats.created END DESC,
    CASE WHEN :sorting = 'ended asc' THEN n_chats.created END ASC,
    CASE WHEN :sorting = 'base_id desc' THEN n_chats.base_id END DESC,
    CASE WHEN :sorting = 'base_id asc' THEN n_chats.base_id END ASC,
    CASE WHEN :sorting = 'feedback desc' THEN feedback_text END DESC,
    CASE WHEN :sorting = 'feedback asc' THEN feedback_text END ASC,
    CASE WHEN :sorting = 'rating desc' THEN 
        CASE 
            WHEN rc.is_five_rating_scale = 'true' 
            THEN chat.feedback_rating_five 
            ELSE chat.feedback_rating 
        END 
    END DESC,
    CASE WHEN :sorting = 'rating asc' THEN 
        CASE 
            WHEN rc.is_five_rating_scale = 'true' 
            THEN chat.feedback_rating_five 
            ELSE chat.feedback_rating 
        END 
    END ASC,
    chat.base_id ASC
OFFSET ((GREATEST(:page, 1) - 1) * :page_size)
LIMIT :page_size;
