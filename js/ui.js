'use strict';
var pontoon, newGameButton, newDealButton, addPlayerButton, cutDeckButton, dealButton, userTemplate, playersDiv, stakesElem, bankerDisplay, twistButtons, splitHandButton, stickButtons, turnDisplay, buyButtons, betButtons;


// PUB-SUB
(function( $ ) { // Can't pass arrays with this implementation
	var o = $( {} );
	$.each({
		trigger: 'publish',
		on: 'subscribe',
		off: 'unsubscribe'
	}, function(key, val) {
		jQuery[val] = function() {
			o[key].apply(o, arguments);
		};
	});
})( jQuery )


function init() {
	cache();
	gameStart();
	addPlayer('Nat');
	addPlayer('Joe');
	addPlayer('Brian');
}

function cache() {
	stakesElem = document.getElementById('stakes');
	bankerDisplay = document.getElementById('banker');
	newGameButton = document.getElementById('new-game');
	newDealButton = document.getElementById('new-deal');
	addPlayerButton = document.getElementById('add-player');
	cutDeckButton = document.getElementById('cut-deck');
	dealButton = document.getElementById('deal');
	playersDiv = document.getElementById('container');
	turnDisplay = document.getElementById('turn');
	userTemplate = document.getElementById('user-template').innerHTML.trim();
	twistButtons = document.getElementsByClassName('twist');
	// splitHandButton = document.getElementsByClassName('split');
	stickButtons = document.getElementsByClassName('stick');
	buyButtons = document.getElementsByClassName('buy');
	betButtons = document.getElementsByClassName('bet');
}

function bindEvents() {
	addPlayerButton.addEventListener('click', addPlayer);
	cutDeckButton.addEventListener('click', () => { cutForBanker(); });
	dealButton.addEventListener('click', () => { 
		pontoon.table.deal(); 
		displayHand(pontoon.table.dealOrder);

		registerEventHandlers(twistButtons, 'click', twist);
		// registerEventHandlers(splitHandButton, 'click', splitHand);
		registerEventHandlers(stickButtons, 'click', stick);
		registerEventHandlers(buyButtons, 'click', buy);
		registerEventHandlers(betButtons, 'click', bet);
	});
	newGameButton.addEventListener('click', newGame);
	newDealButton.addEventListener('click', newDeal);
}

function gameStart() {
	pontoon = new Pontoon(50, 500);
	pontoon.table.deck.shuffle();
	pontoon.setState('gameStart');
	stakesElem.innerHTML = pontoon.loStake + ' / ' + pontoon.hiStake;
	bindEvents();
}

function newGame() {
	pontoon.table.deck = new Deck({ // Instead creating new deck, return hands and shuffle
		cardVals: cardVals
	});
	pontoon.table.deck.shuffle();

	pontoon.setState('gameStart');

	dealButton.removeAttribute('disabled');
	newGameButton.setAttribute('disabled', true);

	pontoon.table.playerTurn = [];
	pontoon.table.hands = [];
	turnDisplay.innerHTML = '';

	for (var i = 0, len = pontoon.table.dealOrder.length; i < len; i++) {
		var player = pontoon.players.lookup(pontoon.table.dealOrder[i]);

		player.hand = new Hand();
		document.getElementById('hand_' + player.id).innerHTML = '';
		document.getElementById('hand-name_' + player.id).innerHTML = '';
		document.getElementById('hand-state_' + player.id).innerHTML = '';
		stickButtons[i].setAttribute('disabled', true);
	}
}

function newDeal() {
	pontoon.setState('gameStart');

	dealButton.removeAttribute('disabled');
	newDealButton.setAttribute('disabled', true);

	pontoon.table.playerTurn = [];
	pontoon.table.hands = [];
	turnDisplay.innerHTML = '';

	for (var i = 0, len = pontoon.table.dealOrder.length; i < len; i++) {
		var player = pontoon.players.lookup(pontoon.table.dealOrder[i]);

		player.hand = new Hand();
		document.getElementById('hand_' + player.id).innerHTML = '';
		document.getElementById('hand-name_' + player.id).innerHTML = '';
		document.getElementById('hand-state_' + player.id).innerHTML = '';
		stickButtons[i].setAttribute('disabled', true);
	}
}

function addPlayer(name) {
	if (pontoon.table.dealOrder.length < 8) {
		var name = name.target ? prompt('Enter player name.') : name;
		if (!name) { }
		else if (name === '') { addPlayer(); } 
		else {
			var id = pontoon.table.addToTable(name);
			displayPlayer( pontoon.players.lookup(id) );
		}
		if (pontoon.table.dealOrder.length === 8) {
			addPlayerButton.setAttribute('disabled', true);
		}
	}
}

function displayPlayer(player) {
	var list = '';
	list += userTemplate.replace(/{{id}}/g, player.id)
						.replace(/{{name}}/i, player.name)
						.replace(/{{chips}}/i, player.chips);

	playersDiv.innerHTML += list;
}

function cutForBanker() {
	if (!pontoon.table.banker) {
		var banker = pontoon.table.determineDealer(),
			nameDisplay = document.getElementById( 'player_' + banker );
		
		if (banker || banker === 0) {
			nameDisplay.className += ' banker';
			bankerDisplay.innerHTML = pontoon.players.lookup(banker).name;
			displayCut();
		}

		pontoon.table.setDealOrder();
		cutDeckButton.setAttribute('disabled', true);
		addPlayerButton.setAttribute('disabled', true);
		dealButton.removeAttribute('disabled');
	}
}

function displayCut() {
	for (var i = 0; i < pontoon.table.dealOrder.length; i++) {
		var player = pontoon.players.lookup( pontoon.table.dealOrder[i] ),
			cutSpan = document.getElementById( 'cut_' + player.id );

		cutSpan.className += ' ' + player.cutCard.suit;
		cutSpan.innerHTML = charMap[player.cutCard.name()];
	}

	$('.cut').fadeOut(3000);
}

function displayHand(order) { 
	for (var i = 0; i < order.length; i++) {
		var hand = pontoon.players.lookup(order[i]).hand,
			handLen = hand.cards.length -1,
			card = hand.cards[handLen].name(),
			handSpan = document.getElementById('hand_' + order[i]),
			handNameSpan = document.getElementById('hand-name_' + order[i]),
			handStateSpan = document.getElementById('hand-state_' + order[i]),
			handTotal = hand.value,
			handState = hand.state,
			handName = hand.name;

		if (order[i] !== pontoon.table.banker) {
			handSpan.innerHTML += '<span class=" ' + hand.cards[handLen].suit + '">' + charMap[card] + '</span>';
			handNameSpan.innerHTML = (handTotal > 21) ? '' : handName;
			if (handState) { handStateSpan.innerHTML = handState; }
		}
		else {
			if (pontoon.table.playerTurn[0] === pontoon.table.banker || hand.name === 'Pontoon') {
				handSpan.innerHTML = '';
				for (var i = 0; i < hand.cards.length; i++) {
					var card = hand.cards[i].name();
					handSpan.innerHTML += '<span class=" ' + hand.cards[i].suit + '">' + charMap[card] + '</span>';
				}
				handNameSpan.innerHTML = (handTotal > 21 && handState !== '(Soft)' ) ? '' : handName;
				if (handState) { handStateSpan.innerHTML = handState; }
			} else {
				handSpan.innerHTML += '<span>' + charMap['Reverse'] + '</span>';
			}
		}
	}
}

function displayBet(id) {
	document.getElementById('stake-total_'+id).innerHTML = (pontoon.players.lookup(id).betTotal() === 0) ? '' : pontoon.players.lookup(id).betTotal();
	document.getElementById('chips_'+id).innerHTML = pontoon.players.lookup(id).chips;

	if (pontoon.players.lookup(id).betTotal() !== 0) {
		betsFinished();
	}
}

function betsFinished() {
	var bets = 0;
	for (var i = 0; i < pontoon.table.dealOrder.length; i++) {
		if ( pontoon.players.lookup(pontoon.table.dealOrder[i]).bets.length > 0 ) { bets++; }
	}

	if (bets === pontoon.table.dealOrder.length -1) { $.publish('betsFinished'); }
}

// function splitHand() {
// 	console.log('Split hand');

// 	var id = pontoon.table.playerTurn[0],
// 		splitHandSpan = document.getElementById('split-hand-'+id);

// 	pontoon.players.lookup(id).splitHand();
// 	displayHand([id]);
// }

function buy() {
	console.log('Buy one');
	var player = pontoon.table.playerTurn;
	pontoon.players.lookup(player).buy(pontoon.loStake);
	displayHand([player]);
	displayBet([player]);
	$.publish('Buy', player);
}

function bet() {
	var id = this.id.split('-');
	console.log(id[1] + ' placed a bet');
	pontoon.players.lookup(id[1]).bet(pontoon.loStake);
	this.setAttribute('disabled', true);
	displayBet(id[1]);
}

function twist() {
	console.log('Twist');
	var player = pontoon.table.playerTurn;
	pontoon.players.lookup(player).twist();
	displayHand([player]);
	$.publish('Twist', player);
}

function stick() {
	console.log('Stick');
	document.getElementById('stick-'+pontoon.table.playerTurn[0]).setAttribute('disabled', true);
	document.getElementById('twist-'+pontoon.table.playerTurn[0]).setAttribute('disabled', true);
	document.getElementById('buy-'+pontoon.table.playerTurn[0]).setAttribute('disabled', true);

	if (pontoon.table.playerTurn[0] === pontoon.table.banker) {
		$.publish('gameFinished', pontoon.table.playerTurn);
	} else {
		$.publish('turnFinished', pontoon.table.playerTurn);
	}
}

function checkHands(order) {
	var pontoons;
	var banker = pontoon.players.lookup(pontoon.table.banker);
	for (var i = 0; i < order.length; i++) {
		var player = pontoon.players.lookup(order[i]);
		if (banker.hand.name === 'Pontoon') {
			console.log('Banker has pontoon');
			banker.chips += player.betTotal();
			pontoons = 'Banker';
		} 
		else if (banker.hand.state === 'Bust') {
			console.log('Banker is bust');
			player.chips += player.betTotal();
			if (player.hand.name === 'Pontoon') { var win = player.betTotal() * 2; if (!pontoons) {pontoons = order[i];} }
			else if (player.hand.name === '5 card trick') { var win = player.betTotal() * 2; }
			else { var win = player.betTotal(); }
			banker.chips -= win;
			player.chips += win;
		} 
		else if (banker.hand.name === '21') {
			console.log('Banker has 21');
			var win = player.betTotal();
			if (player.hand.name === 'Pontoon') { 
				banker.chips -= win * 2;
				player.chips += win * 3;
				if (!pontoons) {pontoons = order[i];}
			}
			else if (player.hand.name === '5 card trick') {
				banker.chips -= win * 2;
				player.chips += win * 3;
			}
			else { banker.chips += win; }
		} 
		else if (banker.hand.name === '5 card trick') {
			console.log('Banker has 5 card trick');
			var win = player.betTotal();				
			if (player.hand.name === 'Pontoon') {
				banker.chips -= win * 2;
				player.chips += win * 3;
				if (!pontoons) {pontoons = order[i];}
			}
			else { banker.chips += win; }
		}
		else if (banker.hand.value < 21) {
			console.log('Banker paying >' + banker.hand.value);
			var win = player.betTotal();
			if (player.hand.name === 'Pontoon') { 
				banker.chips -= win * 2;
				player.chips += win * 3;
				if (!pontoons) {pontoons = order[i];}
			}
			else if (player.hand.name === '5 card trick') {
				banker.chips -= win * 2;
				player.chips += win * 3;
			}
			else if (player.hand.value > banker.hand.value) {
				banker.chips -= win;
				player.chips += win * 2;
			}
			else { banker.chips += win; }
		}
		player.bets = [];
		displayBet(order[i]);
	}
	displayBet(pontoon.table.banker);
	return pontoons;
}

function returnCards() {
	for (var i = 0; i < pontoon.table.dealOrder.length; i++) {
		pontoon.players.lookup(pontoon.table.dealOrder[i]).returnCards();		
	}
}


// SUBS
$.subscribe('gameStart', function() {
	console.log('Game started');
});

$.subscribe('firstDeal', function() {
	console.log('First deal: initial stakes');
	pontoon.setState('initialStakes');
});

$.subscribe('initialStakes', function() {
	dealButton.setAttribute('disabled', true);

	for (var i = 0; i < pontoon.table.dealOrder.length; i++) {
		if (pontoon.table.dealOrder[i] !== pontoon.table.banker) {
			document.getElementById('bet-'+pontoon.table.dealOrder[i]).removeAttribute('disabled');
		}
	}
});

$.subscribe('betsFinished', function() {
	console.log('Bets finsihed');
	dealButton.removeAttribute('disabled');
});

$.subscribe('dealFinished', function() {
	console.log('Deal finished: turns');
	dealButton.setAttribute('disabled', true);
	pontoon.setState('playerTurns');
});

$.subscribe('playerTurns', function() {
	if (pontoon.players.lookup(pontoon.table.banker).hand.name === 'Pontoon') {
		for (var i = 0; i < pontoon.table.dealOrder.length; i++) {
			if (pontoon.table.dealOrder[i] != pontoon.table.banker) {
				pontoon.players.lookup(pontoon.table.dealOrder[i]).bust();
			}
			displayBet(pontoon.table.dealOrder[i]);
		}
		displayHand([pontoon.table.banker]);
		pontoon.setState('gameFinished');
	} 
	else {
		var id = pontoon.table.turns();

		turnDisplay.innerHTML = pontoon.players.lookup(id).name;

		if (pontoon.players.lookup(id).hand.name !== 'Pontoon') {
			document.getElementById('twist-'+id).removeAttribute('disabled');
			document.getElementById('buy-'+id).removeAttribute('disabled');

			if (pontoon.players.lookup(id).hand.value >= 15) {
				document.getElementById('stick-'+id).removeAttribute('disabled');
			}

			if (pontoon.players.lookup(id).hand.cards[0].rank === pontoon.players.lookup(id).hand.cards[1].rank) {
				// document.getElementById('split-'+id).removeAttribute('disabled');
			}
		} else {
			$.publish('turnFinished', id);
		}
	}
});

$.subscribe('turnFinished', function(e, id) {
	console.log('Next turn: '+id);
	document.getElementById('twist-'+id).setAttribute('disabled', true);
	document.getElementById('stick-'+id).setAttribute('disabled', true);
	// document.getElementById('split-'+id).setAttribute('disabled', true);
	document.getElementById('buy-'+id).setAttribute('disabled', true);

	if (id != pontoon.table.banker) {
		if (pontoon.players.lookup(id).hand.state != 'Bust') {
			pontoon.table.hands.push(id);
		} else {
			pontoon.players.lookup(id).bust();
			displayBet(id);
			displayBet(pontoon.table.banker);
		}
	}

	var nextId = pontoon.table.turns(),
		player = pontoon.players.lookup(nextId),
		hand;

		if (nextId === pontoon.table.banker) {
			if (pontoon.table.hands.length === 0) {
				console.log('Triggered this..');
				pontoon.players.lookup(nextId).returnCards();
				newDealButton.removeAttribute('disabled');
				return;
			}
		}

		if (nextId === id) {
			hand = player.splitHand;
		} 
		else {
			hand = player.hand;
		}

	turnDisplay.innerHTML = player.name;
	document.getElementById('twist-'+nextId).removeAttribute('disabled');

	if (hand.name !== 'Pontoon') {
		if (nextId !== pontoon.table.banker) {
			document.getElementById('buy-'+nextId).removeAttribute('disabled');

			if (hand.cards[0].rank === hand.cards[1].rank) {
				// document.getElementById('split-'+nextId).removeAttribute('disabled');
			}
		} else {
			displayHand([nextId]);	
		}

		if (hand.value >= 15) {
			document.getElementById('stick-'+nextId).removeAttribute('disabled');
		}
	} else {
		$.publish('turnFinished', nextId);
	}

});

$.subscribe('gameFinished', function() {
	console.log('Turns finished: check hands');

	dealButton.setAttribute('disabled', true);

	if (pontoon.players.lookup(pontoon.table.banker).hand.name !== 'Pontoon') {
		var id = pontoon.table.playerTurn[0];
		document.getElementById('twist-'+id).setAttribute('disabled', true);
		document.getElementById('stick-'+id).setAttribute('disabled', true);	
	
		var result = checkHands(pontoon.table.hands);

		if (!result) {
			returnCards();
			newDealButton.removeAttribute('disabled');
		} else if (result === 'Banker') {
			newGameButton.removeAttribute('disabled');
		} else {
			pontoon.table.banker = result;
			pontoon.table.setDealOrder();
			newGameButton.removeAttribute('disabled');
			bankerDisplay.innerHTML = pontoon.players.lookup(result).name;
		}
	} else {
		newGameButton.removeAttribute('disabled');
	}
});

$.subscribe('Twist', function(e, id) {
	// document.getElementById('split-'+id).setAttribute('disabled', true);
	document.getElementById('buy-'+id).setAttribute('disabled', true);

	var hand = pontoon.players.lookup(id).hand;

	if (hand.value >= 15) {
		document.getElementById('stick-'+id).removeAttribute('disabled');
	}

	if (id === pontoon.table.banker) {
		if (hand.name === 'Pontoon') {
			$.publish('gameFinished');
		} else if (hand.state === 'Bust') {
			$.publish('gameFinished');
		} else if (hand.cards.length === 5) {
			$.publish('gameFinished');
		} else if (hand.name === '21') {
			$.publish('gameFinished');
		} else if (hand.value === 21 && hand.state != 'Soft') {
			// Compare hand to highest player hand
		}
	} else {
		if (hand.cards.length === 5) {
			$.publish('turnFinished', id);
		} else if (hand.name === 'Pontoon') {
			$.publish('turnFinished', id);
		} else if (hand.state === 'Bust') {
			$.publish('turnFinished', id);
		} else if (hand.name === '21') {
			$.publish('turnFinished', id);
		} else if (hand.value === 21 && hand.state != 'Soft') {
			$.publish('turnFinished', id);
		}
	}
});

$.subscribe('Buy', function(e, id) {
	// document.getElementById('split-'+id).setAttribute('disabled', true);

	var hand = pontoon.players.lookup(id).hand;

	if (hand.value >= 15) {
		document.getElementById('stick-'+id).removeAttribute('disabled');
	}

	if (hand.cards.length === 5) {
		$.publish('turnFinished', id);
	} else if (hand.name === 'Pontoon') {
		$.publish('turnFinished', id);
	} else if (hand.state === 'Bust') {
		$.publish('turnFinished', id);
	} else if (hand.name === '21') {
		$.publish('turnFinished', id);
	} else if (hand.value === 21 && hand.state != 'Soft') {
		$.publish('turnFinished', id);
	}
});


// UTILITY FUNCTIONS
function registerEventHandlers(nodes, event, handler) {
	forEach(nodes, function(node) {
		node.addEventListener(event, handler);
	});
}

init();