jQuery(document).ready(function ($) {
  if ($(".csc-frame-frame1").length > 0) {
    $('<div id="video-wrap"></div>').insertBefore(
      ".csc-frame-frame1:first-child"
    );
    $("#video-wrap").before('<h1 id="title-video"></h1>');

    //var page_title = $("h1").text();
    //$("#title-video").text(page_title);

    $("#video-wrap").html(
      '<div id="jp_container_1" class="jp-video jp-video-270p" role="application" aria-label="media player"><div class="jp-type-playlist"><div id="jquery_jplayer_1" class="jp-jplayer"></div><div class="jp-gui"><div class="jp-video-play"><button class="jp-video-play-icon" role="button" tabindex="0">play</button></div><div class="jp-interface"><div class="jp-progress"><div class="jp-seek-bar"><div class="jp-play-bar"></div></div></div><div class="jp-current-time" role="timer" aria-label="time">&nbsp;</div><div class="jp-duration" role="timer" aria-label="duration">&nbsp;</div><div class="jp-controls-holder"><div class="jp-controls"><button class="jp-previous" role="button" tabindex="0">previous</button><button class="jp-play" role="button" tabindex="0">play</button><button class="jp-next" role="button" tabindex="0">next</button><button class="jp-stop" role="button" tabindex="0">stop</button></div><div class="jp-volume-controls"><button class="jp-mute" role="button" tabindex="0">mute</button><button class="jp-volume-max" role="button" tabindex="0">max volume</button><div class="jp-volume-bar"><div class="jp-volume-bar-value"></div></div></div><div class="jp-toggles"><button class="jp-repeat" role="button" tabindex="0">repeat</button><button class="jp-shuffle" role="button" tabindex="0">shuffle</button><button class="jp-full-screen" role="button" tabindex="0">full screen</button></div></div><div class="jp-details"><div class="jp-title" aria-label="title">&nbsp;</div></div></div></div><div class="jp-playlist"><ul><li>&nbsp;</li></ul></div><div class="jp-no-solution"><span>Update Required</span>To play the media you will need to either update your browser to a recent version or update your <a href="http://get.adobe.com/flashplayer/" target="_blank">Flash plugin</a>.</div></div></div>'
    );

    var video_arr = [];

    $(".csc-frame-frame1").each(function () {
      var title = $(this).find("h2 a").text();
      $(this).find("h2").hide();

      var img_url = $(this).find(".csc-textpic-center img").attr("src");
      $(this).find(".csc-textpic-center img").hide();

      var text = $(this).find("p").text();
      var url = $(this).find("a").first().attr("href");
      var block_id = $(this).attr("id");

      video_arr.push({
        title: title,
        m4v: url,
        block: block_id,
        poster: img_url,
      });
    });

    var cssSelector = {
      jPlayer: "#jquery_jplayer_1",
      cssSelectorAncestor: "#jp_container_1",
    };

    var playlist = [];

    var options = {
      swfPath: "fileadmin/template/jplayer/jplayer",
      supplied: "webmv, ogv, m4v",
      useStateClassSkin: true,
      autoBlur: false,
      smoothPlayBar: false,
      keyEnabled: true,
      //size: {
      //    width: "430px",
      //    height: "242px"
      //}
    };

    var myPlaylist = new jPlayerPlaylist(cssSelector, playlist, options);

    for (i = 0; i < video_arr.length; i++) {
      myPlaylist.add(video_arr[i]);
    }

    $("#jquery_jplayer_1").bind($.jPlayer.event.play, function (event) {
      var id = event.jPlayer.status.media["block"];
      //var title = event.jPlayer.status.media['title'];

      $(".csc-frame-frame1").each(function () {
        if ($(this).attr("id") == id) {
          $(".csc-frame-frame1").removeClass("active");
          $(this).addClass("active");
        }
      });

      //$('#title-video').text(title);
    });
  }
});
