-- Synthetic simulation only. This query materializes the reviewed report rows.
WITH criteria(metric, label, probability, threshold, median_count, denominator) AS (
  VALUES
    ('bids_opened', '인수처 확인 자료 검토', 0.777, '6/10명 이상', 7, 10),
    ('recalculation_opened', '조건 탐색', 0.752, '3/10명 이상', 4, 10),
    ('confirmation_opened', '배분안 확정 화면 진입', 0.784, '2/10명 이상', 3, 10),
    ('pilot_interest', '파일럿 참여 의향', 0.635, '기업 5곳 중 3곳 이상', 3, 5),
    ('paid_pilot', '유료 파일럿', 0.39299999999999996, '기업 5곳 중 2곳 이상', 1, 5),
    ('all_criteria', '모든 기준 동시 충족', 0.188, '5개 기준 모두 충족', NULL, NULL)
),
sensitivity(scenario, label, all_criteria_probability, investment_rule_probability, iterations) AS (
  VALUES
    ('conservative', '보수', 0.016, 0.057, 20000),
    ('base', '기준', 0.188, 0.309, 50000),
    ('optimistic', '낙관', 0.523, 0.621, 20000)
)
SELECT
  'criterion' AS row_type,
  metric AS row_id,
  label,
  probability,
  threshold,
  median_count,
  denominator,
  NULL AS all_criteria_probability,
  NULL AS investment_rule_probability,
  NULL AS iterations
FROM criteria
UNION ALL
SELECT
  'scenario' AS row_type,
  scenario AS row_id,
  label,
  NULL AS probability,
  NULL AS threshold,
  NULL AS median_count,
  NULL AS denominator,
  all_criteria_probability,
  investment_rule_probability,
  iterations
FROM sensitivity;
