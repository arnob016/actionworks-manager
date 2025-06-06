-- Ensure you have run 001-initial-schema.sql first!

-- Delete existing tasks to start fresh (optional, be careful with real data)
-- DELETE FROM tasks;

-- Insert dummy tasks
INSERT INTO tasks (title, description, status, priority, assignees, start_date, due_date, effort, product_area, reporter, "order", tags, is_private)
VALUES
  ('Design new homepage', 'Create mockups for the new homepage design, focusing on user engagement.', 'To Do', 'Highest', '{"Zonaid", "Alice"}', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 'L', 'User Interface', 'Zonaid', 0, '{"design", "ux"}', FALSE),
  ('Develop API for user authentication', 'Implement OAuth 2.0 for user sign-in and registration.', 'In Progress', 'High', '{"Alice"}', NOW() - INTERVAL '5 days', NOW() + INTERVAL '10 days', 'XL', 'Core Platform', 'Zonaid', 0, '{"api", "auth", "security"}', FALSE),
  ('Write documentation for API', 'Document all endpoints for the new user authentication API.', 'Backlog', 'Medium', '{"Zonaid"}', NOW() + INTERVAL '1 day', NOW() + INTERVAL '15 days', 'M', 'Core Platform', 'Alice', 0, '{"docs", "api"}', FALSE),
  ('Test payment gateway integration', 'Perform thorough testing of the Stripe payment gateway.', 'In Review', 'Highest', '{"Alice"}', NOW() - INTERVAL '1 day', NOW() + INTERVAL '3 days', 'S', 'Core Platform', 'Zonaid', 0, '{"testing", "payments"}', TRUE),
  ('Plan Q3 marketing campaign', 'Outline strategy and budget for the upcoming Q3 marketing initiatives.', 'New', 'High', '{"Zonaid"}', NOW(), NOW() + INTERVAL '20 days', 'L', 'Marketing', 'Alice', 0, '{"marketing", "strategy"}', FALSE),
  ('Refactor legacy codebase for module X', 'Improve performance and maintainability of Module X.', 'To Do', 'Medium', '{"Alice"}', NOW() + INTERVAL '3 days', NOW() + INTERVAL '30 days', 'XL', 'Core Platform', 'Zonaid', 1, '{"refactor", "tech-debt"}', FALSE),
  ('User research for new feature Y', 'Conduct user interviews and surveys to gather requirements for Feature Y.', 'In Progress', 'High', '{"Zonaid"}', NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', 'M', 'User Interface', 'Alice', 1, '{"research", "ux"}', FALSE),
  ('Fix bug #1023 - Login button unresponsive', 'The login button on the staging environment is not working.', 'In Progress', 'Highest', '{"Alice"}', NOW(), NOW() + INTERVAL '1 day', 'XS', 'User Interface', 'Zonaid', 2, '{"bugfix", "critical"}', FALSE),
  ('Onboard new team member', 'Prepare onboarding materials and schedule introductory meetings.', 'Done', 'Medium', '{"Zonaid"}', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', 'S', 'HR', 'Alice', 0, '{"onboarding"}', FALSE),
  ('Setup CI/CD pipeline', 'Configure GitHub Actions for automated testing and deployment.', 'Completed', 'High', '{"Alice"}', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', 'L', 'DevOps', 'Zonaid', 0, '{"cicd", "automation"}', FALSE);

-- Note: The "order" field is set simply here.
-- Your application logic in useTaskStore.addTask and reordering functions will handle more dynamic ordering.
-- For tasks within the same status, you might want to ensure their initial order values are distinct if that's critical before app logic takes over.
-- For example, for 'In Progress' tasks:
-- Task 2: order 0
-- Task 7: order 1
-- Task 8: order 2
-- This script sets them all to 0, 1, or 2 within their status based on insertion order, which is fine for initial seeding.
-- The application's fetchTasks sorts by the global order.
