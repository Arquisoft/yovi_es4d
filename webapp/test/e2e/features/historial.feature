Feature: Historial Page
  As a user
  I want to view my game history
  So that I can see my stats and past games

  Scenario: Redirects to login if not logged in
    Given I am logged out
    When the historial page is open
    Then I should be on the login page
