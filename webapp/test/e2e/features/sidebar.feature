Feature: Sidebar
  As a user
  I want to use the sidebar navigation
  So that I can access different sections and change language

  Scenario: Sidebar renders with all buttons
    Given the home page is open
    Then I should see the sidebar
    And I should see the language selector
    And I should see a rules button
    And I should see a profile button
    And I should see a historial button
    And I should see a login or logout button

  Scenario: Change language to English
    Given the home page is open
    When I select "en" in the language selector
    Then the sidebar should be in English

  Scenario: Navigate to rules page
    Given the home page is open
    When I click the rules button
    Then I should be on the rules page

  Scenario: Navigate to profile page
    Given the home page is open
    When I click the profile button
    Then I should be on the profile page

  Scenario: Navigate to historial page
    Given the home page is open
    When I click the historial button
    Then I should be on the historial page

  Scenario: Click login button when logged out
    Given the home page is open
    And I am logged out
    When I click the login button
    Then I should be on the login page

  Scenario: Click logout button when logged in
    Given the home page is open
    And I am logged in
    When I click the logout button
    Then I should be logged out
    And I should see the login button
