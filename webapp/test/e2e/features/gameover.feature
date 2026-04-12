Feature: Game Over page

Scenario: Game Over without game data
  Given the Game Over page is open without game data
  Then I should see the no game message

Scenario: Show winner and scores
  Given the Game Over page is open with a finished game
  Then I should see the winner name Alice
  And I should see player score 0010
  And I should see opponent score 0005

Scenario: Navigate to new game
  Given the Game Over page is open with a finished game
  When I click new game button
  Then I should be redirected to select page

Scenario: Navigate home
  Given the Game Over page is open with a finished game
  When I click go home button
  Then I should be redirected to home page