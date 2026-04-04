Feature: Historial Page
  As a user
  I want to view my game history
  So that I can see my stats and past games

  Scenario: Historial page renders for logged in user
    Given I am logged in
    And the historial page is open
    Then I should see the sidebar
    And I should see the historial title
    And I should see the summary section
    And I should see the filters
    And I should see the games list or a no games message
    And I should see the pagination controls
    And I should see the go back button

  Scenario: Pagination works
    Given I am logged in
    And the historial page is open
    When I click the next page button
    Then the current page should increase
    When I click the previous page button
    Then the current page should decrease

  Scenario: Redirects to login if not logged in
    Given I am logged out
    When the historial page is open
    Then I should be on the login page
