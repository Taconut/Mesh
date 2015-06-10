var curView = "";
var handler = function() {
    $('.fancyInput :input').focus();
};
var fi;
var co;

function albumToUrl(url, cb) {
    if (url == '/img/noAlbum.png') return cb(url);
    var toAlbumId = [
        [/^.*amazon\.com\/images\/P\/(.+?)\.([a-z]{3})$/, 'AM/$1/$2'],
        [/https?:\/\/userserve-[a-z]{2}.last.fm\/serve\/[0-9x]+\/([0-9]+).([a-z]{3})/, 'FM/$1/$2'],
        [/^([A,F]M\/)|(\/[a-z]{3})$|[^\.0-9A-Za-z]+/g, '$1$2']
    ];
    for (var i in toAlbumId)
        url = url.replace(toAlbumId[i][0], toAlbumId[i][1]);
    $.ajax(base + '/proxy/' + url).done(cb);
}

function clrSearch() {
    fancyInput.removeChars(fi.siblings('div'), [0]);
    fi.val('');
    $('#searchView').removeClass('choose done');
    $('.card:not(.arrow)').remove();
    $('#up,#down').fadeOut();
    co.css('margin-top', '-1em');
}

function resizeText() {
    var e = $(this);
    var visibleText = e.siblings('div');
    var maxSize = $(window).height() * 0.2;
    var ratio = $(window).width() / (visibleText.width() || 1);
    var oldSize = parseInt(e.css('font-size'), 10);
    var fontSize = Math.min(maxSize, Math.floor(oldSize*ratio));
    e.css('font-size', fontSize);
    visibleText.css({
        'font-size': fontSize,
        'line-height': 2*maxSize - fontSize + 'px'
    });
}

function initSearch() {
    fi = $('#answer :input');
    co = $('#container');
    fi.fancyInput();
    $('#searchView input')
        .on('keyup.resize keydown.resize', resizeText)
        .triggerHandler('keyup.resize')
    ;
    $('#searchView .minus').click(hideSearch);
    $('#cancel').click(clrSearch);
}

function hideSearch() {
    clrSearch();
    var sa = $('#searchView');
    sa.removeClass('visible');
    setTimeout(function() {
        sa.css('display', 'none');
    }, 350);
    $('.fancyInput :input')
        .unbind('blur', handler)
        .blur()
    ;
}

function showSearch(view) {
    curView = view;
    $('#bubble').attr('style', '');
    $.sidr('close', 'stat');
    $('.minus').css({
        display: (curView == 'firstStation') ? 'none' : 'block'
    });
    $('#searchView').css('display', 'block');
    setTimeout(function() {
        $('#searchView')
            .removeClass('done')
            .addClass('visible')
            .find(':input').val('')
        ;
    }, 50);
    handler();
    $('.fancyInput :input').bind('blur', handler);
}

function addStat() {
    var query = $('#answer :input').val();
    var bootstrapMode = curView != 'song';
    //Loading sign
    $.ajax(base + '/search/' + encodeForURI(query) + (bootstrapMode ? '' : '/noGenre' )).done(function(results) {
        for (var i in results) {
            var result = results[i];
            //jshint multistr:true
            var elem = $('\
                <div class="card" onclick="selectSong(this);">\
                    <div class="image"></div>\
                    <span class="type"></span>\
                    <span class="name"></span>\
                </div>\
            ').attr({
                'data-img': result.img,
                'data-id': result.id,
                'data-query': query,
                'data-album': result.album
            });
            elem.find('.type').text(result.type);
            elem.find('.image').attr('style', 'background-image: url(' + result.img + ')');
            switch(result.type) {
                case 'song':
                    elem.find('.name').html(result.song + '<br>' + result.artist);
                break;
                case 'album':
                    elem.find('.name').html(result.artist + '<br>' + result.name);
                break;
                default:
                    elem.find('.name').text(result.name);
                break;
            }
            elem.appendTo('#container');
        }
        $('#searchView').addClass('choose');
        setTimeout(refreshScroll, 350);
    });
}

function selectSong(self) {
    $('#searchView').removeClass('choose').addClass('done');
    var target = $(self);
    var query = target.data('query');
    if (target.find('.type').text() == 'song')
        query = $.parseHTML(target.find('.name').html().split('<br>')[1])[0].textContent;
    var funct = (curView != 'song' ? bootstrapSearch : playSearch);
    funct(target, query);
}

function refreshScroll() {
    var mtop = parseFloat(co.attr('style').replace(/margin-top: |em/g,''));
    if (mtop == -1)
        $('#up').fadeOut();
    else
        $('#up').fadeIn();
    if (mtop*px + co.offset().top + co.height() - 8.25*px < 10)
        $('#down').fadeOut();
    else
        $('#down').fadeIn();
}

function scrollPage(doUp) {
    var mtop = parseFloat(co.attr('style').replace(/margin-top: |em/g,''));
    co.css('margin-top', mtop + (doUp ? -8.25 : 8.25) + 'em');
    setTimeout(refreshScroll, 350);
}

function playSearch(target, query) {
    var id = target.data('id');
    switch(target.find('.type').text()) {
        case 'song': 
            var songArtist = target.find('.name').html().split('<br>');
            albumToUrl(target.find('.image').attr('style').slice(22, -1), function(dataStr) {
                var getMetadata = function(len) {
                    colorGen([{
                        id:         target.data('id'),
                        songName:   songArtist[0],
                        artistName: songArtist[1],
                        albumName:  target.data('album'),
                        albumUrl:   dataStr,
                        len: len && parseFloat(len)
                    }], function(searchRes) {
                        playSong(searchRes, 'next');
                    });
                };
                if (audioWorkaround) {
                    $.ajax(
                        base + '/stream/' +
                        encodeForURI(songArtist[1]) + '/' +
                        encodeForURI(songArtist[0]) + '/metadata'
                    ).done(getMetadata);
                } else getMetadata();
            });
        break;
        case 'album':
            var albumArtist = target.find('.name').html().split('<br>');
            albumToUrl(target.find('.image').attr('style').slice(22, -1), function(dataStr) {
                colorGen([{
                    songName:   albumArtist[1],
                    artistName: albumArtist[0],
                    albumUrl:   dataStr
                }], function(searchRes) {
                    var baseData = {
                        albumUrl: searchRes.albumUrl,
                        color: searchRes.color,
                        albumName: albumArtist[1],
                    };
                    var songsInAlbum = [];
                    var procNextSong = function(songs) {
                        if (!songs.length) return playSong(songsInAlbum, 'next');
                        var songInAlbum = songs[0];
                        var realSong = $.extend({}, baseData, songInAlbum);
                        if (audioWorkaround) {
                            $.ajax(
                                base + '/stream/' +
                                encodeForURI(songInAlbum.artistName) + '/' +
                                encodeForURI(songInAlbum.songName) + '/metadata'
                            ).done(function(len) {
                                realSong.len = parseFloat(len);
                                if (realSong.len) songsInAlbum.push(realSong);
                                procNextSong(songs.slice(1));
                            });
                        } else {
                            songsInAlbum.push(realSong);
                            procNextSong(songs.slice(1));
                        }
                    }
                    var albumId;
                    if (id)
                        albumId = id;
                    else
                        albumId = encodeForURI(albumArtist[0]) + '/' + encodeForURI(albumArtist[1]);
                    $.ajax({
                        url: base + '/album/' + albumId,
                        dataType: 'json'
                    }).done(procNextSong);
                });
            });
        break;
        default:
            alert('Feature Not Yet Implemented. Please listen to a song instead.');
        break;
    }
    hideSearch();
}

function bootstrapSearch(target, query) {
    var id = target.data('id');
    var nsImg = target.data('img') || 'img/noAlbum.png';
    $.ajax('/bootstrap/' + query + '/' + id).done(function(data) {
        $.ajax('/stations/' + data).done(function(subdata) {
            var newStation = JSON.parse(subdata);
            $('#bubble').css('background-image', 'url("' + nsImg + '")');
            $('<img/>').attr('src', nsImg).load(function() {
                var newStat = appendStation(newStation);
                var bubble = $('#bubble').css({
                    opacity: 1,
                    position: 'fixed'
                });
                sFreeze = true;
                $.sidr('open', 'stat');
                setTimeout(function() {
                    hideSearch();
                    bubble.animate($.extend(newStat.offset(), {
                        margin: 0,
                        width:  '7.875em',
                        height: '7.875em'
                    }), 1000, 'swing', function() {
                        (curView == 'firstStation' ? initWithStation : loadStation)(data);
                        sFreeze = false;
                        bubble
                            .addClass('noTransition')
                            .css('opacity', 0)
                        ;
                        setTimeout(function() {
                            //jshint -W030
                            bubble[0].offsetHeight; //Trigger Transition
                            //jshint +W030
                            bubble.css({
                                position: 'absolute',
                                top: '',
                                left: '',
                                width:  '8.5em',
                                height: '8.5em'
                            });
                            bubble.removeClass('noTransition');
                        }, 1);
                    });
                }, 500);
            });
        });
    });
}