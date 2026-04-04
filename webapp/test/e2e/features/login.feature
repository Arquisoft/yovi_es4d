Feature: Login
  As a user
  I want to log in to the application
  So that I can access my account

  Scenario: Successful login
    Given a test user exists
    And the login page is open
    When I enter a valid email and password
    And I submit the login form
    Then I should be redirected to the home page

  Scenario: Invalid email
    Given the login page is open
    When I enter an invalid email and a valid password
    And I submit the login form
    Then I should see an error message

  Scenario: Invalid password
    Given the login page is open
    When I enter a valid email and an invalid password
    And I submit the login form
    Then I should see an error message

  Scenario: Empty fields
    Given the login page is open
    When I submit the login form
    Then I should see an error message
