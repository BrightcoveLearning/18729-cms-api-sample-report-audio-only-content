var BCLS = (function(window, document) {
  var account_id,
    client_id,
    client_secret,
    // api stuff
    proxyURL = 'https://solutions.brightcove.com/bcls/bcls-proxy/bcls-proxy-v2.php',
    baseURL = 'https://cms.api.brightcove.com/v1/accounts/',
    limit = 25,
    totalVideos = 0,
    totalCalls = 0,
    callNumber = 0,
    videosCompleted = 0,
    videosArray = [],
    audiosArray = [],
    summaryData = {},
    csvStr,
    summaryCsvStr,
    customFields = [],
    // elements
    account_id_element = document.getElementById('account_id'),
    client_id_element = document.getElementById('client_id'),
    client_secret_element = document.getElementById('client_secret'),
    tag = document.getElementById('tag'),
    videoCount = document.getElementById('videoCount'),
    makeReport = document.getElementById('makeReport'),
    tableBody = document.getElementById('tableBody'),
    content,
    logger = document.getElementById('logger'),
    logText = document.getElementById('logText'),
    csvData = document.getElementById('csvData'),
    apiRequest = document.getElementById('apiRequest'),
    allButtons = document.getElementsByName('button'),
    pLogGettingVideos = document.createElement('p'),
    pLogGettingRenditions = document.createElement('p'),
    pLogFinish = document.createElement('p'),
    spanIntro2 = document.createElement('span'),
    spanOf2 = document.createElement('span'),
    spanRenditionsTotal = document.createElement('span'),
    spanRenditionsCount = document.createElement('span'),
    spanRenditionsTotalEl,
    spanRenditionsCountEl;

  /**
   * tests for all the ways a variable might be undefined or not have a value
   * @param {String|Number} x the variable to test
   * @return {Boolean} true if variable is defined and has a value
   */
  function isDefined(x) {
    if (x === '' || x === null || x === undefined) {
      return false;
    }
    return true;
  }

  /*
   * tests to see if a string is json
   * @param {String} str string to test
   * @return {Boolean}
   */
  function isJson(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  /*
   * tests to see if a string is json
   * @param {String} str string to test
   * @return {Boolean}
   */
  function isAudio(rendition) {
    if (rendition.hasOwnProperty('audio_only') && rendition.audio_only === false) {
      return false;
    } else if (rendition.hasOwnProperty('media_type') && rendition.media_type === 'video') {
      return false;
    }
    return true;
  }

  /**
   * get selected value for single select element
   * @param {htmlElement} e the select element
   */
  function getSelectedValue(e) {
    return e.options[e.selectedIndex].value;
  }

  /**
   * disables all buttons so user can't submit new request until current one finishes
   */
  function disableButtons() {
    var i,
      iMax = allButtons.length;
    for (i = 0; i < iMax; i++) {
      allButtons[i].setAttribute('disabled', 'disabled');
    }
  }

  /**
   * re-enables all buttons
   */
  function enableButtons() {
    var i,
      iMax = allButtons.length;
    for (i = 0; i < iMax; i++) {
      allButtons[i].removeAttribute('disabled');
    }
  }

  function processRenditions(video, renditions) {
    var i,
      iMax = renditions.length,
      audioRenditions = 0;
    if (video.id === '5831706803001') {}
    // separate renditions by type
    for (i = 0; i < iMax; i++) {
      if (isAudio(renditions[i])) {
        audioRenditions++;
      } else {
        // if any non-audio renditions, stop
        break;
      }
    }
    // check to see if all renditions are audio
    if (audioRenditions === renditions.length) {
      video.renditionCount = audioRenditions;
      audiosArray.push(video);
      return;
    } else {
      return;
    }
  }

  function writeReport() {
    var i,
      iMax,
      item,
      tr,
      td,
      frag = document.createDocumentFragment();
    csvStr = '"ID","Name","Description","Number of Renditions""Date Added","Date Last Modified",\r\n';
    if (audiosArray.length > 0) {
      iMax = audiosArray.length;
      for (i = 0; i < iMax; i++) {
        item = audiosArray[i];
        // replace any line breaks in description, as that will break the CSV
        if (item.description) {
          item.description = item.description.replace(/(?:\r\n|\r|\n)/g, ' ');
        }
        // generate the video detail row
        // add csv row
        csvStr += '"' + item.id + '","' + item.name + '","' + item.description + '","' + (item.duration / 1000) + '","' + item.renditionCount + '","' + item.created_at + '","' + item.updated_at + '",\r\n';
        // create the table row
        tr = document.createElement('tr');
        td = document.createElement('td');
        td.textContent = item.id;
        tr.appendChild(td);
        td = document.createElement('td');
        td.textContent = item.name;
        tr.appendChild(td);
        td = document.createElement('td');
        td.textContent = item.description;
        tr.appendChild(td);
        td = document.createElement('td');
        td.textContent = item.duration / 1000;
        tr.appendChild(td);
        td = document.createElement('td');
        td.textContent = item.renditionCount;
        tr.appendChild(td);
        td = document.createElement('td');
        td.textContent = item.created_at;
        tr.appendChild(td);
        td = document.createElement('td');
        td.textContent = item.updated_at;
        tr.appendChild(td);
        frag.appendChild(tr);
      }
      csvData.textContent += csvStr;
      tableBody.appendChild(frag);
      pLogFinish.textContent = 'Finished! See the results or get the CSV data below.';
      // reportDisplay.innerHTML = summaryReportStr + reportStr;
      enableButtons();
    } else {
      csvData.textContent = 'No audio-only content was found';
      pLogFinish.textContent = 'Finished! No audio-only content was found'
    }
  }

  /**
   * sets up the data for the API request
   * @param {String} id the id of the button that was clicked
   */
  function createRequest(id) {
    var endPoint = '',
      parsedData,
      options = {};
    options.proxyURL = proxyURL;
    options.account_id = account_id;
    if (isDefined(client_id) && isDefined(client_secret)) {
      options.client_id = client_id;
      options.client_secret = client_secret;
    }
    // disable buttons to prevent a new request before current one finishes
    disableButtons();
    switch (id) {
      case 'getCount':
        endPoint = account_id + '/counts/videos';
        if (isDefined(tag.value)) {
          endPoint += '&q=%2Btags:' + tag.value;
        }
        options.url = baseURL + endPoint;
        options.requestType = 'GET';
        apiRequest.textContent = options.url;
        makeRequest(options, function(response) {
          parsedData = JSON.parse(response);
          // set total videos
          video_count = parsedData.count;
          if (totalVideos === "All") {
            totalVideos = video_count;
          } else {
            totalVideos = (totalVideos < video_count) ? totalVideos : video_count;
          }
          totalCalls = Math.ceil(totalVideos / limit);
          logText.textContent = totalVideos + ' videos found; getting account custom fields';
          createRequest('getVideos');
        });
        break;
      case 'getVideos':
        var offset = (limit * callNumber);
        endPoint = account_id + '/videos?limit=' + limit + '&offset=' + offset;
        if (isDefined(tag.value)) {
          endPoint += '&q=%2Btags:' + tag.value;
        }
        options.url = baseURL + endPoint;
        options.requestType = 'GET';
        apiRequest.textContent = options.url;
        makeRequest(options, function(response) {
          parsedData = JSON.parse(response);
          videosArray = videosArray.concat(parsedData);
          callNumber++;
          if (callNumber < totalCalls) {
            createRequest('getVideos');
          } else {
            callNumber = 0;
            spanRenditionsCountEl.textContent = callNumber + 1;
            spanRenditionsTotalEl.textContent = totalVideos;
            totalCalls = totalVideos;
            createRequest('getVideoRenditions');
          }
        });
        break;
      case 'getVideoRenditions':
        if (callNumber < totalCalls) {
          var video = videosArray[callNumber];
          switch (videosArray[callNumber].delivery_type) {
            case 'remote':
              // won't be any renditions
              video.renditions = null;
              callNumber++;
              if (callNumber < totalCalls) {
                createRequest('getVideoRenditions');
              } else {
                // write the report
                writeReport();
              }
              break;
            case 'unknown':
              // won't be any renditions
              video.renditions = null;
              callNumber++;
              if (callNumber < totalCalls) {
                createRequest('getVideoRenditions');
              } else {
                // create csv headings
                writeReport();
              }
              break;
            case 'live_origin':
              // live stream; don't process
              video.renditions = null;
              callNumber++;
              if (callNumber < totalCalls) {
                createRequest('getVideoRenditions');
              } else {
                // write the report
                writeReport();
              }
              break;
            case 'static_origin':
              // legacy ingest
              endPoint = account_id + '/videos/' + video.id + '/assets/renditions';
              break;
            case 'dynamic_origin':
              // dynamic delivery
              endPoint = account_id + '/videos/' + video.id + '/assets/dynamic_renditions';
              break;
            default:
              console.log('should not be here - unknown delivery_type');
          }
          options.url = baseURL + endPoint;
          options.requestType = 'GET';
          apiRequest.textContent = options.url;
          spanRenditionsCountEl.textContent = callNumber + 1;
          makeRequest(options, function(response) {
            var renditions = JSON.parse(response);
            if (renditions.length > 0 && !renditions[0].hasOwnProperty('error_code')) {
              processRenditions(video, renditions);
            }
            videosCompleted++;
            logText.textContent = totalVideos + ' videos found; videos retrieved: ' + videosCompleted;
            callNumber++;
            if (callNumber === totalCalls) {
              // write the report
              writeReport();
            } else {
              createRequest('getVideoRenditions');
            }
          });
        }
        break;
      default:
        console.log('default case - should not be here');
    }
  }

  /**
   * send API request to the proxy
   * @param  {Object} options for the request
   * @param  {String} options.url the full API request URL
   * @param  {String="GET","POST","PATCH","PUT","DELETE"} requestData [options.requestType="GET"] HTTP type for the request
   * @param  {String} options.proxyURL proxyURL to send the request to
   * @param  {String} options.client_id client id for the account (default is in the proxy)
   * @param  {String} options.client_secret client secret for the account (default is in the proxy)
   * @param  {JSON} [options.requestBody] Data to be sent in the request body in the form of a JSON string
   * @param  {Function} [callback] callback function that will process the response
   */
  function makeRequest(options, callback) {
    var httpRequest = new XMLHttpRequest(),
      response,
      requestParams,
      dataString,
      proxyURL = options.proxyURL,
      // response handler
      getResponse = function() {
        try {
          if (httpRequest.readyState === 4) {
            if (httpRequest.status >= 200 && httpRequest.status < 300) {
              response = httpRequest.responseText;
              // some API requests return '{null}' for empty responses - breaks JSON.parse
              if (response === '') {
                response = null;
              }
              // return the response
              callback(response);
            } else {
              logger.appendChild(document.createTextNode('There was a problem with the request. Request returned ' + httpRequest.status));
            }
          }
        } catch (e) {
          logger.appendChild(document.createTextNode('Caught Exception: ' + e));
        }
      };
    /**
     * set up request data
     * the proxy used here takes the following request body:
     * JSON.strinify(options)
     */
    // set response handler
    httpRequest.onreadystatechange = getResponse;
    // open the request
    httpRequest.open('POST', proxyURL);
    // open and send request
    httpRequest.send(JSON.stringify(options));
  }


  function init() {
    // event listeners
    csvData.addEventListener('click', function() {
      this.select();
    });
    // set up the log elements
    content = document.createTextNode('Getting renditions for video ');
    spanIntro2.appendChild(content);
    content = document.createTextNode(' of ');
    spanOf2.appendChild(content);
    spanRenditionsCount.setAttribute('id', 'spanRenditionsCount');
    spanRenditionsTotal.setAttribute('id', 'spanRenditionsTotal');
    pLogGettingRenditions.appendChild(spanIntro2);
    pLogGettingRenditions.appendChild(spanRenditionsCount);
    pLogGettingRenditions.appendChild(spanOf2);
    pLogGettingRenditions.appendChild(spanRenditionsTotal);
    logger.appendChild(pLogGettingRenditions);
    spanRenditionsCountEl = document.getElementById('spanRenditionsCount');
    spanRenditionsTotalEl = document.getElementById('spanRenditionsTotal');
    logger.appendChild(pLogFinish);

  }

  // button event handlers
  makeReport.addEventListener('click', function() {
    // in case of re-run, cleal the results
    csvData.textContent = '';
    // get the inputs
    client_id = client_id_element.value;
    client_secret = client_secret_element.value;
    account_id = (isDefined(account_id_element.value)) ? account_id_element.value : '1752604059001';
    totalVideos = getSelectedValue(videoCount);
    if (totalVideos !== 'All') {
      totalVideos = Number.parseInt(totalVideos, 10)
    }
    // only use entered account id if client id and secret are entered also
    if (!isDefined(client_id) || !isDefined(client_secret) || !isDefined(account_id)) {
      logger.appendChild(document.createTextNode('To use your own account, you must specify an account id, and client id, and a client secret - since at least one of these is missing, a sample account will be used'));
      account_id = '1752604059001';
    }
    // get video count
    createRequest('getCount');

  });

  init();
})(window, document);