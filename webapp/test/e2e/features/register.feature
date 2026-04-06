Feature: Register
  As a user
  I want to be able to register in the application
  So that I can access with my account

  Scenario: Username too short
    Given the register page is open
    When I enter a username with less than 3 characters
    And I fill the rest of the fields correctly
    And I submit the register form
    Then I should see a username error message
