import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GiftedChat,
  Bubble,
  InputToolbar,
  Send,
  Composer,
} from 'react-native-gifted-chat';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useRefresh } from '../../contexts/RefreshContext';

// ============================================================================
// GAME COMPONENTS
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// TIC-TAC-TOE
// ────────────────────────────────────────────────────────────────────────────
function TicTacToeGame({ onClose, groupId, userId, mode }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  const checkWinner = (b) => {
    for (let [a, b1, c] of winningLines) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    return null;
  };

  const submitScore = async (score) => {
    const { error } = await supabase.from('game_scores').insert({
      user_id: userId,
      group_id: groupId,
      game_type: 'tictactoe',
      score: score,
      mode: mode,
    });
    if (error) console.error('Error submitting tictactoe score:', error);
  };

  const makeMove = (i) => {
    if (board[i] || gameOver) return;

    const newBoard = [...board];
    newBoard[i] = turn;
    setBoard(newBoard);

    const win = checkWinner(newBoard);
    if (win) {
      setWinner(win);
      setGameOver(true);
      submitScore(win === 'X' ? 100 : 0);
      return;
    }

    const draw = newBoard.every(Boolean);
    if (draw) {
      setGameOver(true);
      submitScore(50);
      return;
    }

    if (mode === 'solo' && turn === 'X') {
      setTurn('O');
      setTimeout(() => aiMove(newBoard), 500);
    } else {
      setTurn(turn === 'X' ? 'O' : 'X');
    }
  };

  const aiMove = (currentBoard) => {
    const available = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((val) => val !== null);

    if (available.length === 0) return;

    const move = available[Math.floor(Math.random() * available.length)];
    const newBoard = [...currentBoard];
    newBoard[move] = 'O';
    setBoard(newBoard);

    const win = checkWinner(newBoard);
    if (win) {
      setWinner(win);
      setGameOver(true);
      submitScore(win === 'X' ? 100 : 0);
      return;
    }

    const draw = newBoard.every(Boolean);
    if (draw) {
      setGameOver(true);
      submitScore(50);
      return;
    }

    setTurn('X');
  };

  return (
    <View style={styles.gameModal}>
      <Text style={styles.gameTitle}>
        Tic-Tac-Toe {mode === 'solo' ? '(vs AI)' : '(Multiplayer)'}
      </Text>
      {gameOver ? (
        <Text style={styles.gameResult}>
          {winner ? `${winner} Wins!` : "It's a Draw!"}
        </Text>
      ) : (
        <Text style={styles.gameTurn}>Turn: {turn}</Text>
      )}
      <View style={styles.tttBoard}>
        {board.map((cell, i) => (
          <TouchableOpacity
            key={i}
            style={styles.tttCell}
            onPress={() => makeMove(i)}
            disabled={gameOver}
          >
            <Text style={styles.tttCellText}>{cell}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ROCK-PAPER-SCISSORS
// ────────────────────────────────────────────────────────────────────────────
function RockPaperScissorsGame({ onClose, groupId, userId }) {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [aiChoice, setAiChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);

  const choices = ['rock', 'paper', 'scissors'];
  const icons = {
    rock: 'hand-back-right',
    paper: 'hand-wave',
    scissors: 'content-cut',
  };

  const playRound = (choice) => {
    const ai = choices[Math.floor(Math.random() * 3)];
    setPlayerChoice(choice);
    setAiChoice(ai);

    let roundResult = 'draw';
    let points = 0;

    if (choice === ai) {
      roundResult = 'draw';
      points = 10;
    } else if (
      (choice === 'rock' && ai === 'scissors') ||
      (choice === 'paper' && ai === 'rock') ||
      (choice === 'scissors' && ai === 'paper')
    ) {
      roundResult = 'win';
      points = 30;
    } else {
      roundResult = 'lose';
      points = 0;
    }

    setResult(roundResult);
    setScore((prev) => prev + points);
    setRounds((prev) => prev + 1);
  };

  const endGame = async () => {
    const { error } = await supabase.from('game_scores').insert({
      user_id: userId,
      group_id: groupId,
      game_type: 'rockpaperscissors',
      score: score,
      mode: 'solo',
    });
    if (error) {
      console.error('Error submitting rockpaperscissors score:', error);
      Alert.alert('Error', 'Failed to save score');
      return;
    }
    Alert.alert('Game Saved!', `Final Score: ${score} (${rounds} rounds)`);
    onClose();
  };

  return (
    <View style={styles.gameModal}>
      <Text style={styles.gameTitle}>Rock Paper Scissors</Text>
      <Text style={styles.scoreDisplay}>Score: {score}</Text>
      <Text style={styles.roundsDisplay}>Rounds: {rounds}</Text>

      {result && (
        <View style={styles.rpsResultContainer}>
          <View style={styles.rpsChoice}>
            <Text style={styles.rpsLabel}>You</Text>
            <MaterialCommunityIcons name={icons[playerChoice]} size={48} color="#6366f1" />
            <Text style={styles.rpsChoiceText}>{playerChoice}</Text>
          </View>
          <Text style={styles.rpsVs}>VS</Text>
          <View style={styles.rpsChoice}>
            <Text style={styles.rpsLabel}>AI</Text>
            <MaterialCommunityIcons name={icons[aiChoice]} size={48} color="#ef4444" />
            <Text style={styles.rpsChoiceText}>{aiChoice}</Text>
          </View>
        </View>
      )}

      {result && (
        <Text style={[styles.rpsResult,
          result === 'win' && styles.rpsWin,
          result === 'lose' && styles.rpsLose,
        ]}>
          {result === 'win' ? 'You Win! +30' : result === 'lose' ? 'You Lose! +0' : 'Draw! +10'}
        </Text>
      )}

      <View style={styles.rpsButtons}>
        {choices.map((choice) => (
          <TouchableOpacity
            key={choice}
            style={styles.rpsButton}
            onPress={() => playRound(choice)}
          >
            <MaterialCommunityIcons name={icons[choice]} size={40} color="#6366f1" />
            <Text style={styles.rpsButtonText}>{choice}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.endGameBtn} onPress={endGame}>
        <Text style={styles.endGameText}>End & Save Score</Text>
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MEMORY CARDS
// ────────────────────────────────────────────────────────────────────────────
function MemoryCardsGame({ onClose, groupId, userId }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(1000);
  const [gameFinished, setGameFinished] = useState(false);

  // Use state instead of ref to track matched count correctly
  const [matchedCount, setMatchedCount] = useState(0);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const symbols = ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒'];
    const deck = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({ id: index, symbol }));
    setCards(deck);
    setMatchedCount(0);
    setGameFinished(false);
  };

  const finishGame = async (finalScore) => {
    if (gameFinished) return; // Prevent double submission
    setGameFinished(true);

    const { error } = await supabase.from('game_scores').insert({
      user_id: userId,
      group_id: groupId,
      game_type: 'memory',
      score: finalScore,
      mode: 'solo',
    });
    if (error) {
      console.error('Error submitting memory score:', error);
    }
    Alert.alert('Complete!', `Score: ${finalScore}`, [
      { text: 'OK', onPress: onClose },
    ]);
  };

  const flipCard = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const newMoves = moves + 1;
      const newScore = Math.max(0, score - 50);
      setMoves(newMoves);
      setScore(newScore);
      checkMatch(newFlipped, newScore);
    }
  };

  const checkMatch = (flippedIds, currentScore) => {
    const [firstId, secondId] = flippedIds;
    const firstCard = cards.find((c) => c.id === firstId);
    const secondCard = cards.find((c) => c.id === secondId);

    if (firstCard.symbol === secondCard.symbol) {
      const newMatched = [...matched, firstId, secondId];
      setMatched(newMatched);
      setFlipped([]);

      const newMatchedCount = matchedCount + 2;
      setMatchedCount(newMatchedCount);

      if (newMatchedCount === cards.length) {
        finishGame(currentScore);
      }
    } else {
      setTimeout(() => setFlipped([]), 1000);
    }
  };

  return (
    <View style={styles.gameModal}>
      <Text style={styles.gameTitle}>Memory Cards</Text>
      <Text style={styles.scoreDisplay}>Score: {score}</Text>
      <Text style={styles.movesDisplay}>Moves: {moves}</Text>
      <View style={styles.memoryGrid}>
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
          return (
            <TouchableOpacity
              key={card.id}
              style={[styles.memoryCard, isFlipped && styles.memoryCardFlipped]}
              onPress={() => flipCard(card.id)}
            >
              <Text style={styles.memoryCardText}>{isFlipped ? card.symbol : '?'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// QUICK MATH DUEL
// ────────────────────────────────────────────────────────────────────────────
function QuickMathDuel({ onClose, groupId, userId }) {
  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(10);
  const maxRounds = 5;

  useEffect(() => {
    generateProblem();
  }, [round]);

  useEffect(() => {
    if (timeLeft > 0 && round <= maxRounds) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      nextRound(false);
    }
  }, [timeLeft]);

  const generateProblem = () => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];

    let correctAnswer;
    switch (op) {
      case '+': correctAnswer = a + b; break;
      case '-': correctAnswer = a - b; break;
      case '*': correctAnswer = a * b; break;
    }

    setProblem({ a, b, op, correctAnswer });
    setAnswer('');
    setTimeLeft(10);
  };

  const checkAnswer = () => {
    const correct = parseInt(answer) === problem.correctAnswer;
    if (correct) {
      setScore((prev) => prev + (timeLeft * 10));
    }
    nextRound(correct);
  };

  const nextRound = (wasCorrect) => {
    if (round >= maxRounds) {
      finishGame();
    } else {
      setRound((prev) => prev + 1);
    }
  };

  const finishGame = async () => {
    const { error } = await supabase.from('game_scores').insert({
      user_id: userId,
      group_id: groupId,
      game_type: 'quickmath',
      score: score,
      mode: 'solo',
    });
    if (error) {
      console.error('Error submitting quickmath score:', error);
    }
    Alert.alert('Game Over!', `Final Score: ${score}`, [
      { text: 'OK', onPress: onClose },
    ]);
  };

  if (!problem) return null;

  return (
    <View style={styles.gameModal}>
      <Text style={styles.gameTitle}>Quick Math Duel</Text>
      <Text style={styles.roundDisplay}>Round {round}/{maxRounds}</Text>
      <Text style={styles.scoreDisplay}>Score: {score}</Text>
      <Text style={[styles.timerDisplay, timeLeft < 4 && styles.timerWarning]}>
        Time: {timeLeft}s
      </Text>

      <View style={styles.mathProblem}>
        <Text style={styles.mathText}>
          {problem.a} {problem.op} {problem.b} = ?
        </Text>
      </View>

      <View style={styles.mathInput}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.mathButton}
            onPress={() => setAnswer(answer + num)}
          >
            <Text style={styles.mathButtonText}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.answerDisplay}>{answer || '_'}</Text>

      <View style={styles.mathControls}>
        <TouchableOpacity style={styles.mathClear} onPress={() => setAnswer('')}>
          <Text style={styles.mathClearText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mathSubmit} onPress={checkAnswer}>
          <Text style={styles.mathSubmitText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SPEED CHALLENGE
// ────────────────────────────────────────────────────────────────────────────
function SpeedChallengeGame({ onClose, groupId, userId }) {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameActive) {
      finishGame();
    }
  }, [timeLeft, gameActive]);

  const startGame = () => {
    setGameActive(true);
    setTaps(0);
    setTimeLeft(10);
  };

  const handleTap = () => {
    if (gameActive) {
      setTaps((prev) => prev + 1);
    }
  };

  const finishGame = async () => {
    setGameActive(false);
    const score = taps * 10;

    const { error } = await supabase.from('game_scores').insert({
      user_id: userId,
      group_id: groupId,
      game_type: 'speedchallenge',
      score: score,
      mode: 'solo',
    });
    if (error) {
      console.error('Error submitting speedchallenge score:', error);
    }
    Alert.alert('Time Up!', `${taps} taps! Score: ${score}`, [
      { text: 'OK', onPress: onClose },
    ]);
  };

  return (
    <View style={styles.gameModal}>
      <Text style={styles.gameTitle}>Speed Challenge</Text>
      {!gameActive ? (
        <>
          <Text style={styles.speedInstructions}>
            Tap the button as fast as you can for 10 seconds!
          </Text>
          <TouchableOpacity style={styles.speedStart} onPress={startGame}>
            <Text style={styles.speedStartText}>START</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.speedTimer}>{timeLeft}s</Text>
          <Text style={styles.speedTaps}>{taps} taps</Text>
          <TouchableOpacity
            style={styles.speedTapArea}
            onPress={handleTap}
            activeOpacity={0.7}
          >
            <Text style={styles.speedTapText}>TAP!</Text>
          </TouchableOpacity>
        </>
      )}
      {!gameActive && taps > 0 && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// MAIN GROUP CHAT SCREEN
// ============================================================================

export default function GroupChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();
  const { subscribeToTable } = useRefresh();

  const [messages, setMessages] = useState([]);
  const [showGames, setShowGames] = useState(false);
  const [activeGame, setActiveGame] = useState(null);
  const [gameMode, setGameMode] = useState(null);

  const games = [
    {
      id: '1',
      name: 'Tic-Tac-Toe',
      icon: 'gamepad-variant',
      component: TicTacToeGame,
      modes: ['solo', 'multiplayer'],
    },
    {
      id: '2',
      name: 'Rock Paper Scissors',
      icon: 'hand-back-right',
      component: RockPaperScissorsGame,
      modes: ['solo'],
    },
    {
      id: '3',
      name: 'Memory Cards',
      icon: 'cards',
      component: MemoryCardsGame,
      modes: ['solo'],
    },
    {
      id: '4',
      name: 'Quick Math Duel',
      icon: 'calculator',
      component: QuickMathDuel,
      modes: ['solo'],
    },
    {
      id: '5',
      name: 'Speed Challenge',
      icon: 'speedometer',
      component: SpeedChallengeGame,
      modes: ['solo'],
    },
  ];

  useEffect(() => {
    navigation.setOptions({
      title: groupName || 'Group Chat',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ padding: 8, marginRight: 8 }}
            onPress={() => navigation.navigate('Leaderboard', { groupId, groupName })}
          >
            <MaterialCommunityIcons name="trophy" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 8, marginRight: 8 }}
            onPress={() => navigation.navigate('GroupDetail', { groupId, groupName })}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [groupName, navigation]);

  useEffect(() => {
    load();

    const unsubscribe = subscribeToTable(
      'messages',
      `group_id=eq.${groupId}`,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMessage = mapMsg(payload.new);
          setMessages((prev) => {
            const exists = prev.find(m => m._id === newMessage._id);
            if (exists) return prev;
            return [newMessage, ...prev];
          });
        }
      }
    );

    return unsubscribe;
  }, [groupId]);

  const mapMsg = (m) => ({
    _id: m.id,
    text: m.content,
    createdAt: new Date(m.created_at),
    user: {
      _id: m.user_id,
      name: m.full_name || 'User',
      avatar: m.avatar_url || undefined,
    },
  });

  const load = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data?.length) setMessages(data.map(mapMsg));
  };

  const onSend = useCallback(async (m = []) => {
    const msg = m[0];
    const optimisticMessage = {
      ...msg,
      _id: `temp-${Date.now()}`,
      pending: true,
    };

    setMessages((p) => [optimisticMessage, ...p]);

    const { data } = await supabase
      .from('messages')
      .insert({
        group_id: groupId,
        user_id: user.id,
        content: msg.text,
        full_name: user.full_name || user.email,
        avatar_url: user.avatar_url || null,
      })
      .select()
      .single();

    if (data) {
      setMessages((p) =>
        p.map((x) => (x._id === optimisticMessage._id ? mapMsg(data) : x))
      );
    }
  }, [groupId, user]);

  const renderBubble = (props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: '#6366f1',
          marginVertical: 4,
          marginHorizontal: 8,
          borderRadius: 16,
          borderBottomRightRadius: 4,
        },
        left: {
          backgroundColor: '#f1f5f9',
          marginVertical: 4,
          marginHorizontal: 8,
          borderRadius: 16,
          borderBottomLeftRadius: 4,
        },
      }}
      textStyle={{
        right: { color: '#fff', fontSize: 15 },
        left: { color: '#1e293b', fontSize: 15 },
      }}
      timeTextStyle={{
        right: { color: '#e0e7ff' },
        left: { color: '#94a3b8' },
      }}
    />
  );

  const renderAvatar = ({ currentMessage }) => {
    if (!currentMessage.user.avatar) {
      return (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>
            {currentMessage.user.name[0]?.toUpperCase()}
          </Text>
        </View>
      );
    }
    return <Image source={{ uri: currentMessage.user.avatar }} style={styles.avatar} />;
  };

  const renderInputToolbar = (props) => (
    <InputToolbar {...props} containerStyle={styles.toolbar}>
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowGames(true)}
        >
          <MaterialCommunityIcons name="gamepad-variant" size={24} color="#6366f1" />
        </TouchableOpacity>

        <View style={styles.composerContainer}>
          <Composer
            {...props}
            textInputStyle={styles.composer}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
          />
        </View>

        <Send {...props} containerStyle={styles.sendContainer}>
          <View style={styles.sendButton}>
            <MaterialCommunityIcons name="send" size={22} color="#fff" />
          </View>
        </Send>
      </View>
    </InputToolbar>
  );

  const selectGame = (game) => {
    if (game.modes.length === 1) {
      setGameMode(game.modes[0]);
      setActiveGame(() => game.component);
      setShowGames(false);
    } else {
      Alert.alert(
        'Select Mode',
        'Choose how you want to play',
        [
          {
            text: 'Solo', onPress: () => {
              setGameMode('solo');
              setActiveGame(() => game.component);
              setShowGames(false);
            },
          },
          {
            text: 'Multiplayer', onPress: () => {
              setGameMode('multiplayer');
              setActiveGame(() => game.component);
              setShowGames(false);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{ _id: user.id }}
        renderBubble={renderBubble}
        renderAvatar={renderAvatar}
        renderInputToolbar={renderInputToolbar}
        alwaysShowSend
        inverted
        bottomOffset={0}
        renderUsernameOnMessage
        showAvatarForEveryMessage
      />

      <Modal visible={showGames} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowGames(false)}
        >
          <View style={styles.gameList}>
            <View style={styles.gameListHeader}>
              <Text style={styles.gameListTitle}>Choose a Game</Text>
              <TouchableOpacity onPress={() => setShowGames(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {games.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.gameItem}
                onPress={() => selectGame(g)}
              >
                <View style={styles.gameIconContainer}>
                  <MaterialCommunityIcons name={g.icon} size={24} color="#6366f1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameText}>{g.name}</Text>
                  <Text style={styles.gameMode}>{g.modes.join(' / ')}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {activeGame && (
        <Modal visible transparent animationType="slide">
          <View style={styles.overlay}>
            {React.createElement(activeGame, {
              onClose: () => {
                setActiveGame(null);
                setGameMode(null);
              },
              groupId,
              userId: user.id,
              mode: gameMode,
            })}
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 60,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  composerContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    minHeight: 40,
    justifyContent: 'center',
  },
  composer: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1e293b',
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c7d2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#4338ca', fontWeight: '700', fontSize: 14 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameList: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
  },
  gameListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  gameListTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  gameIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameText: { fontSize: 16, fontWeight: '500', color: '#1e293b' },
  gameMode: { fontSize: 12, color: '#64748b', marginTop: 2 },
  gameModal: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  gameTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#1e293b' },
  gameTurn: { fontSize: 16, color: '#6366f1', marginBottom: 16, fontWeight: '600' },
  gameResult: { fontSize: 18, color: '#22c55e', marginBottom: 16, fontWeight: '700' },
  tttBoard: { width: 240, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  tttCell: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tttCellText: { fontSize: 42, fontWeight: '700', color: '#1e293b' },
  scoreDisplay: { fontSize: 18, fontWeight: '700', color: '#6366f1', marginBottom: 8 },
  roundsDisplay: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  rpsResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 20,
  },
  rpsChoice: { alignItems: 'center' },
  rpsLabel: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  rpsChoiceText: { fontSize: 14, color: '#1e293b', marginTop: 8, fontWeight: '600' },
  rpsVs: { fontSize: 20, fontWeight: '700', color: '#94a3b8' },
  rpsResult: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  rpsWin: { color: '#22c55e' },
  rpsLose: { color: '#ef4444' },
  rpsButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  rpsButton: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  rpsButtonText: { fontSize: 12, color: '#1e293b', marginTop: 8, fontWeight: '600' },
  endGameBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  endGameText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  movesDisplay: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    marginBottom: 20,
  },
  memoryCard: {
    width: 65,
    height: 65,
    margin: 2,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryCardFlipped: { backgroundColor: '#eef2ff' },
  memoryCardText: { fontSize: 28 },
  roundDisplay: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  timerDisplay: { fontSize: 16, fontWeight: '700', color: '#22c55e', marginBottom: 16 },
  timerWarning: { color: '#ef4444' },
  mathProblem: {
    backgroundColor: '#eef2ff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    width: '100%',
  },
  mathText: { fontSize: 32, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  mathInput: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 220,
    marginBottom: 16,
  },
  mathButton: {
    width: 42,
    height: 42,
    margin: 2,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mathButtonText: { fontSize: 20, fontWeight: '700', color: '#6366f1' },
  answerDisplay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    minWidth: 100,
    textAlign: 'center',
  },
  mathControls: { flexDirection: 'row', gap: 12, marginTop: 8 },
  mathClear: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  mathClearText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  mathSubmit: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  mathSubmitText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  speedInstructions: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  speedStart: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
  },
  speedStartText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  speedTimer: { fontSize: 48, fontWeight: '700', color: '#6366f1', marginBottom: 16 },
  speedTaps: { fontSize: 20, color: '#64748b', marginBottom: 24 },
  speedTapArea: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedTapText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  closeBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  closeText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});