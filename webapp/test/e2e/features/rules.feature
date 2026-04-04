Feature: Rules Page
  As a user
  I want to view the rules of the game
  So that I can understand how to play

  Scenario: Viewing the rules page
    Given the rules page is open
    Then I should see the rules title
    And I should see the rules descriptions
    And I should see a link to Wikipedia
    And I should see a go back button

  Scenario: Go back button returns to start
    Given the rules page is open
    When I click the go back button
    Then I should be redirected to the start screen
