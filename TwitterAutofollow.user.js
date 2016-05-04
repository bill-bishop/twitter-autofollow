// ==UserScript==
// @name         twitter auto follow/unfollow
// @match        https://twitter.com/*
// ==/UserScript==

NodeList.prototype.forEach = Array.prototype.forEach;
HTMLCollection.prototype.forEach = Array.prototype.forEach;

var logElement = document.createElement('iframe');
logElement.style.display = 'none';
document.body.appendChild(logElement);
function debug() {
    /* DEBUG: Re-enable twitter's fuckin overwritten console.log */
    logElement.contentWindow.console.log(arguments);
}

var followedUsers = (localStorage.getItem('following') || '').split(',');
var unfollowedUsers = (localStorage.getItem('unfollowed') || '').split(',');
var taggedUsers = JSON.parse(localStorage.getItem('taggedUsers') || '{}');

function save() {
    localStorage.setItem('following', followedUsers);
    localStorage.setItem('taggedUsers', JSON.stringify(taggedUsers));
    localStorage.setItem('unfollowed', unfollowedUsers);
}

var stopScript = false;

function toggleFollow(button, followedByScriptOnly, following, tag) {
    button.scrollIntoView();
    window.scrollBy(0, -150);
    var userId = button.parentNode.getAttribute('data-user-id');
    if(!userId) {
        debug('ERROR: BLANK USER ID', userId, button);
    }
    var previouslyFollowedByScript = followedUsers.indexOf(userId) > -1;
    var previouslyUnfollowedByScript = unfollowedUsers.indexOf(userId) > -1;
    if(tag) {
        taggedUsers[tag] = taggedUsers[tag] || [];
    }

    if (!previouslyUnfollowedByScript &&
        (!followedByScriptOnly || (previouslyFollowedByScript && followedByScriptOnly)) &&
        (!tag || following || taggedUsers[tag].indexOf(userId) > -1)) {
        if (!previouslyUnfollowedByScript && following) {
            followedUsers.push(userId);
            if(tag) {
                taggedUsers[tag].push(userId);
            }
        }
        else if (previouslyFollowedByScript && !following) {
            unfollowedUsers.push(followedUsers.splice(followedUsers.indexOf(userId), 1));
            if(tag) {
                taggedUsers[tag].splice(taggedUsers[tag].indexOf(userId), 1);
            }
        }
        save();
        button.click();
    }
    else {
        debug('skipped', userId, 'previouslyUnfollowed', previouslyUnfollowedByScript, 'previouslyFollowed', previouslyFollowedByScript);
        button.parentNode.appendChild((function () {
            var el = document.createElement('span');
            el.innerHTML = 'skipped';
            return el;
        })());
        button.parentNode.removeChild(button);
    }
}

function clickAll(cssSelector, timeout, followedByScriptOnly, following, tag) {
    stopScript = following && document.getElementsByClassName('message-text')[0].innerHTML.indexOf('unable to follow more people') > -1;
    var buttons = document.querySelectorAll(cssSelector);
    buttons.forEach(function (button, i) {
        setTimeout(function () {
            if (!stopScript) {
                toggleFollow(button, followedByScriptOnly, following, tag);
                if (i + 1 === buttons.length) {
                    clickAll(cssSelector, timeout, followedByScriptOnly, following, tag);
                }
            }
        }, i * timeout);
    });
    if (!buttons.length) {
        setTimeout(function () {
            if (!stopScript) {
                window.scrollBy(0, 9999);
                clickAll(cssSelector, timeout, followedByScriptOnly, following, tag);
            }
        }, timeout * 2);
    }
}

function followAll() {
    clickAll(".not-following .follow-btn," +
    " .not-following .follow-button," +
    " .not-following .ProfileTweet-actionButton", 50, false, true);
}

function followAndTag() {
    var tag = prompt('Enter tag');
    if(tag) {
        clickAll(".not-following .follow-btn," +
        " .not-following .follow-button," +
        " .not-following .ProfileTweet-actionButton", 50, false, true, tag);
    }
}

function unfollowScriptedFollows() {
    clickAll(".following .follow-btn, .following .follow-button", 0, true, false);
}

function unfollowByTag() {
    var tag = prompt('Enter tag');
    if(tag) {
        clickAll(".following .follow-btn, .following .follow-button", 0, false, false, tag);
    }
}

function unfollowAll() {
    clickAll(".following .follow-btn, .following .follow-button", 0, false, false);
}

function stop() {
    stopScript = true;
}

(function appendOptionsBar() {
    function appendFollowedPopup() {
        var showFollowed = document.createElement('span');
        showFollowed.setAttribute('style', 'position: absolute; ' +
        'top: 150px; left: 150px; right: 150px;' +
        'z-index: 9999; background-color: white; padding: 25px; border: 1px solid gray;');
        showFollowed.innerHTML = 'Click to close <br><br>' + followedUsers.join(', ');
        showFollowed.addEventListener('click', function () {
            showFollowed.parentNode.removeChild(showFollowed);
        });
        document.getElementsByTagName('body')[0].appendChild(showFollowed);
        showFollowed.scrollIntoView();
    }

    var options = document.createElement('div');
    options.setAttribute('style', 'padding: 10px; text-align: right');

    function appendOption(text, onclick, color) {
        color = color || 'rgb(80, 80, 223)';
        var option = document.createElement('span');
        option.addEventListener('click', onclick);
        option.innerHTML = text;
        option.setAttribute('style', 'color: white; background-color: ' + color + '; padding: 5px;' +
        ' border-radius: 5px; margin: 5px; cursor: pointer; opacity: 0.4');
        options.appendChild(option);
    }

    appendOption('Follow (all on page)', followAll);
    appendOption("Unfollow (by script)", unfollowScriptedFollows);
    appendOption("Unfollow (all on page)", unfollowAll);
    appendOption("Stop Script", stop, 'red');
    appendOption('Follow & Tag', followAndTag, 'black');
    appendOption("Unfollow (by Tag)", unfollowByTag, 'black');
    /* DEBUG BUTTONS
    appendOption("Show Followed", appendFollowedPopup, 'gray');
    appendOption("Clear followed", function () {
        followedUsers = [];
        localStorage.clear('followed');
    }, 'gray');*/

    document.getElementsByClassName('topbar')[0].appendChild(options);
})();
