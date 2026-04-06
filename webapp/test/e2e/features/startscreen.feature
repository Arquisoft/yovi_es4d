Feature: StartScreen
  As a user
  I want to interact with the start screen
  So that I can start playing and see the welcome information

  Scenario: Start screen renders correctly
    Given the start screen is open
    Then I should see the sidebar
    And I should see the title
    And I should see the subtitle
    And I should see the play button
    And I should see the typing animation
    And I should see the footer credits
