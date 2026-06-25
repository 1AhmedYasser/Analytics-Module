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
    WHERE chat_id = :id
),
ChatHistoryComments AS (
    SELECT
        chc.comment,
        chc.chat_id
    FROM chat_history_comments chc
    JOIN MaxChatHistoryComments m ON chc.id = m.maxId
),
latest_chat AS (
    SELECT 
        base_id,
        customer_support_id,
        customer_support_display_name,
        end_user_id,
        end_user_first_name,
        end_user_last_name,
        status,
        feedback_text,
        feedback_rating,
        feedback_rating_five,
        end_user_email,
        end_user_phone,
        end_user_os,
        end_user_url,
        created,
        updated,
        ended,
        external_id,
        received_from,
        received_from_name,
        forwarded_to_name,
        forwarded_to,
        csa_title
    FROM chat
    WHERE base_id = :id
    ORDER BY updated DESC
    LIMIT 1
),
csa_title_config AS (
    SELECT value
    FROM configuration
    WHERE key = 'is_csa_title_visible'
      AND id IN (SELECT MAX(id) FROM configuration WHERE key = 'is_csa_title_visible' GROUP BY key)
      AND deleted = false
)
SELECT
    c.base_id AS id,
    c.customer_support_id,
    c.customer_support_display_name,
    c.end_user_id,
    c.end_user_first_name,
    c.end_user_last_name,
    c.status,
    c.feedback_text,
    CASE 
        WHEN rc.is_five_rating_scale = 'true' 
        THEN c.feedback_rating_five
        ELSE c.feedback_rating
    END AS feedback_rating,
    c.end_user_email,
    c.end_user_phone,
    c.end_user_os,
    c.end_user_url,
    c.created,
    c.updated,
    c.ended,
    c.external_id,
    c.received_from,
    c.received_from_name,
    c.forwarded_to_name,
    c.forwarded_to,
    (CASE
         WHEN (SELECT COALESCE(value, 'false') FROM csa_title_config) = 'true'
         THEN c.csa_title
         ELSE ''
     END) AS csa_title,
    chc.comment AS comment,
    m.content AS last_message,
    m.updated AS last_message_timestamp
FROM latest_chat c
CROSS JOIN rating_config rc
JOIN message AS m ON c.base_id = m.chat_base_id
LEFT JOIN ChatHistoryComments chc ON c.base_id = chc.chat_id
ORDER BY m.updated DESC
LIMIT 1;
