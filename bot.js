
var Discord = require('discord.io');
// var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var fetch = require('cross-fetch');
var fs = require('fs');

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  // .set('views', path.join(__dirname, 'views'))
  // .set('view engine', 'ejs')
  // .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

// Configure logger settings

console.log('x');

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {colorize: true});
logger.level = 'debug';

console.log('x');

// Initialize Discord Bot

var bot = new Discord.Client({token: auth.token, autorun: true});

console.log('x');

bot.on('ready', function (evt) {

  console.log('x');

logger.info('Connected');
logger.info('Logged in as: ');
logger.info(bot.username + ' - (' + bot.id + ')');});

const search_str = "https://api.scryfall.com/cards/search?q=t%3Acreature+is%3Acommander+f%3Acommander+year%3E%3D2000+%28usd%3C5%29";
const toplist_dir = '/resources/toplist_15-10-20.txt';

function load_toplist(i_dir) {
  try {
    var data = fs.readFileSync(__dirname + i_dir, 'utf8');
    return data.toString();
  } catch(e) {
    // console.log('Error:', e.stack);
  }
}

async function url2json_async(url, print) {
  logger.info("url2str: started");

  return Promise.resolve(fetch(url)
  .then((result) => result.text())
  // .then((body) => {return JSON.parse(body);}))
  .then((body) => {
                    // console.log(body);
                    // if (print) {console.log(JSON.parse(body).data);} //bigprint
                    // console.log(JSON.parse(body).data[0].name);
                    // console.log(typeof(JSON.parse(body)));
                    return JSON.parse(body);
                  }))
}

var url2json_a = async(url) => {
  logger.info("url2str_a: started");
  return fetch(url)
  .then(page_raw => {
    return JSON.parse(page_raw.text());
  })
  // var page_json = JSON.parse(page_raw.text());
  // return page_json;
}

const fetch_card_pool = async(i_search_str) => {
// function fetch_card_pool(i_search_str) {
  var has_more = true;
  var page_json = await url2json_async(i_search_str, true);
  // console.log(page_json.data); //bigprint

  // var page_json = await url2json_a(i_search_str);
  var cards = page_json.data;
  // logger.info("typeof(page_json.data) 1: " + typeof(page_json).toString());
  // logger.info(page_json);
  // logger.info("typeof(cards) 2: " + typeof(cards).toString());

  var i = 0;
  // logger.info("fetch_card_pool: while: started");
  while (has_more && i < 6) {
    if (page_json.has_more) {
      page_json = await url2json_async(page_json.next_page, false);
      cards = cards.concat(page_json.data);

    } else {
      has_more = false;
    }
    i++;
  }

  logger.info("fetch_card_pool: while: after");

  return cards;
}

function filter_toplist(i_cards, i_toplist) {
  console.log("filter_toplist: started");
  console.log("num cards pre-removal:", Object.keys(i_cards).length);
  for (let i = Object.keys(i_cards).length - 1; i > -1; i--) {
    if (i_toplist.search(i_cards[i].name) != -1) {
      // console.log(i_cards[i].name + " removed");
      i_cards.splice(i, 1);
    }  // could add up valid cards into key numbers for random laater
  }
  console.log("num cards post-removal:", Object.keys(i_cards).length);
  return i_cards;
}

function randomly_select(cards, output_size) {
  console.log("randomly_select: started")
  var rand_int_array = generate_rand_int_array(cards.length-1, output_size);
  var selected_cards = [];
  for (let i = 0; i < cards.length; i++) {
    if (rand_int_array.includes(i)) {
        selected_cards.push(cards[i]);
    }
  }
  console.log("randomly_select: returning::");
  // console.log(selected_cards);
  return selected_cards;
}

function generate_rand_int_array(rand_max, output_num) {
  console.log("generate_rand_int_array: started");
  var r_outputs = [];
  var i = 0;
  while (i < 3) {
    var r = Math.floor(Math.random() * rand_max);
    if (!r_outputs.includes(r)) {
      r_outputs.push(r);
      i++;
    }
  }
  console.log("generate_rand_int_array: returning::");
  console.log(r_outputs);
  return r_outputs;
}

function form_message(selected_cards) {
  var output_string = selected_cards[0].name;
  for (let i = 1; i < selected_cards.length; i++) {
    output_string += " - " + selected_cards[i].name;
  }
  return output_string;
}

function form_image(selected_cards) {

}

function get_card_front(card) {
  if ("card_faces" in card && card.layout != "flip") {
    return card.card_faces[0].image_uris.normal;
  } else {
    return card.image_uris.normal;
  }
}

bot.on('message', async function(user, userID, channelID, message, evt) {

if (message.substring(0, 1) == '!') {

    var args = message.substring(1).split(' ');
    var cmd = args[0];

    args = args.splice(1);

    switch(cmd) {
        // !ping
        case 'roll':
            bot.sendMessage({to: channelID, message: 'Drumroll, Please!'});

            const toplist = load_toplist(toplist_dir);

            var cards = await fetch_card_pool(search_str);

            cards = filter_toplist(cards, toplist);

            var selected_cards = randomly_select(cards, 3);

            console.log("papa! selected cards:");
            for (let i = 0; i < selected_cards.length; i++) {
              console.log(selected_cards[i].name);
            }

            var output_message = form_message(selected_cards);

            for (let i = 0; i < selected_cards.length; i++) {
              bot.sendMessage({to:channelID, message: get_card_front(selected_cards[i])});
            }
            bot.sendMessage({to:channelID, message: output_message})
        break;
        // Just add any case commands if you want to..
     }
 }
});
