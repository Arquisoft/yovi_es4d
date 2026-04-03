Feature: Register
  As a user
  I want to be able to register in the application
  So that I can access with my account

  Scenario: Successful registration
    Given the register page is open
    When I enter a valid username, valid email and valid matching passwords
    Then I should be redirected to the login page

  Scenario: Username too short
    Given the register page is open
    When I enter a username with less than 3 characters
    And I fill the rest of the fields correctly
    And I submit the register form
    Then I should see a username error message

  Scenario: Invalid email
    Given the register page is open
    When I enter an invalid email
    And I fill the rest of the fields correctly
    And I submit the register form
    Then I should see an email error message

  Scenario: Weak password
    Given the register page is open
    When I enter a password without uppercase, numbers or less than 8 characters
    And I fill the rest of the fields correctly
    And I submit the register form
    Then I should see a password error message

  Scenario: Passwords do not match
    Given the register page is open
    When I enter passwords that do not match
    And I fill the rest of the fields correctly
    And I submit the register form
    Then I should see a password match error message
