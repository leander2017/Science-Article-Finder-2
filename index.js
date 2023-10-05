import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
var API_KEY = "bf834d0ec7b9fb06a8777d8d353332f1";

const datePattern = /^\d{0,4}-?\d{0,2}-?\d{0,2}$/;
var dateFromParamInvalid = false;
var dateToParamInvalid = false;
var queryUsed = false;
var wordsParam = "";
var journalParam = "";
var titleParam = "";
var typeParam = "";
var yearParam = "";
var dateFromParam = "";
var dateToParam = "";
var accessParam = "";
var searchDateInfo = "OK";
var searchInputArray = [];
var articelArray = [];
var generalJSO = {};


app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  res.render("index.ejs");
});

app.post("/library", (req, res) => {
	if (searchInputArray.length > 0) {
		res.render("index.ejs", { content: articelArray,  contentInfo: generalJSO });
	} else {
		res.render("index.ejs");
	}
});

app.post("/modern", (req, res) => {
	if (searchInputArray.length > 0){
		res.render("modern.ejs", { content: articelArray,  contentInfo: generalJSO });
	} else {
		res.render("modern.ejs");
	}
});

app.post("/clearold", (req, res) => {
	clear();
	res.render("index.ejs");
});

app.post("/clearmodern", (req, res) => {
	clear();
	res.render("modern.ejs");
});



app.post("/getmodern", async (req, res) => {

	clear();

	try { 
		var endpoint = "";

		/* JOURNAL PARAMETER */
		var journal = req.body["journal"];
		console.log(typeof(journal));
		if (journal.length > 0){
			journalParam = "journal:" + "%22" + journal + "%22";
			queryUsed = true;
			searchInputArray.push({"Journal or Category": journal});
		} else {
			searchInputArray.push({"Journal or Category": "All Journals/Books"});
		}

		/* WORDS IN DOCUMENT PARAMETER */
		var words = req.body["words"];
		if (words.length > 0){
			wordsParam = words;
			queryUsed = true;
			searchInputArray.push({"Words in Document": words})
		}

		/* TITLE PARAMETER */
		var titleString = req.body["title"];
		var title = titleString.trimLeft();		
		if (title.length > 0){
			queryUsed = true;
			searchInputArray.push({"Words in Title":  title});
			var titleWords = title.split(" ");
			if (titleWords.length > 1) {
				titleParam = " title:" + titleWords[0];
				for (let i = 1; i <titleWords.length; i++){
					if (titleWords[i] != ""){
						titleParam += " AND title:" + titleWords[i];
					}
				}
			} else {
				titleParam = " title:" + title;
			}
		}

		/* TYPE PARAMETER */
		var type = req.body["type"];
		if (type != "Both"){
			typeParam = " type:" + type;
			queryUsed = true;
			searchInputArray.push({"Type of Literature":  type});
		} else {
			searchInputArray.push({"Type of Literature": "Journals and Books"});
		}

		/* FROM-DATE PARAMETER */
		var fromDate = req.body["fromDate"];
		if (fromDate.length > 0){
			var isValidFromDate = datePattern.test(fromDate);
			if (isValidFromDate){
				dateFromParam = " onlinedatefrom:" + fromDate;
				queryUsed = true;
				searchInputArray.push({"Search from:":  fromDate});
			} else {
				dateFromParam = "";
				dateFromParamInvalid = true;
			}
		}

		/* TO-DATE PARAMETER */
		var toDate = req.body["toDate"];
		if (toDate.length > 0){
			var isValidToDate = datePattern.test(toDate);
			if (isValidToDate){
				dateToParam = " onlinedateto:" + toDate;
				queryUsed = true;
				searchInputArray.push({"Search to:":  toDate});
			} else {
				dateToParam = "";
				dateToParamInvalid = true;
			}
		}
		
		/* YEAR PARAMETER */
		var year = req.body["year"];
		if (year != "none"){
			queryUsed = true;
			yearParam = " year:" + year;
			searchInputArray.push({"Year of Publication": year});
		}


		/* ACCESSIBILITY CHECK openaccess:true*/

		var checkboxValue = req.body["accessCheck"];
		if (checkboxValue == "1"){
			accessParam = " openaccess:true";
			queryUsed = true;
			searchInputArray.push({"Only Open Access": "True"});
		} else {
			searchInputArray.push({"Only Open Access": "False"});
		}

		/* COMPARE FROM-DATE - TO-DATE PARAMETER */
		if (isValidFromDate && isValidToDate){
			const fromSearch = new Date(fromDate);
			const toSearch = new Date(toDate);
			if (fromSearch > toSearch){
				searchDateInfo = `Invalid time limit: End time of the search parameters (${toDate}) is before the start time (${fromDate}).`;
			}
		} 

		for (let i = 0; i < searchInputArray.length; i++){
			var obj = searchInputArray[i];
			for (var key in obj){
				if (obj.hasOwnProperty(key)){
					console.log( "key:", key, " value:", obj[key]);
				}
			}
		}

		if (!queryUsed && !dateFromParamInvalid && !dateToParamInvalid){
			endpoint = "https://api.springernature.com/metadata/json?" + "&p=" + req.body["numberOfResults"] + "&api_key=" + API_KEY;
			const response = await axios.get(endpoint); //wait until this process is done before continue
			var result = response.data;

		} else if (!dateFromParamInvalid && !dateToParamInvalid) {
			endpoint = "https://api.springernature.com/metadata/json?q=(" + wordsParam  + journalParam + typeParam + titleParam + dateFromParam + dateToParam + yearParam + accessParam +")&p=" + req.body["numberOfResults"] + "&api_key=" + API_KEY;
			const response = await axios.get(endpoint); //wait until this process is done before continue
			var result = response.data;
			console.log(endpoint);
		}

		if ((dateToParamInvalid == true) || (dateFromParamInvalid == true)){
			generalJSO = {
				timeSearchInfo: "Invalid time search input.",
				inputParameter: [],
				totalFound: "-",
				articelsToDisplay: "-"
			}
			integerNum = 0;
		} else {
			generalJSO = {
				timeSearchInfo: searchDateInfo,
				inputParameter: searchInputArray,
				totalFound: result["result"][0]["total"],
				articelsToDisplay: result["result"][0]["recordsDisplayed"]
			}
		}

		var integerNum = parseInt(generalJSO["articelsToDisplay"]);
		
		if (integerNum > 0){
			for (let i=0; i < integerNum; i++){
				var abstract = result["records"][i]["abstract"];
				if (abstract == ""){
					abstract = "undefined";
				}
				var nextJSO = {
					publicationDate: result["records"][i]["publicationDate"],
					url: result["records"][i]["url"][0]["value"],
					title: result["records"][i]["title"],
					abstract: abstract
				}
				articelArray.push(nextJSO);
			}
		}
		res.render("modern.ejs", {content: articelArray, contentInfo: generalJSO});
	} catch (error) {
		console.log(error.message);
		generalJSO = {
			timeSearchInfo: "Error: " + error.message,
			inputParameter: [],
			totalFound: "-",
			articelsToDisplay: "-"
		}
		res.render("modern.ejs", { content: articelArray,  contentInfo: generalJSO });
	}
});

app.post("/get", async (req, res) => {

	clear();

	try { 
		var endpoint = "";

		/* JOURNAL PARAMETER */
		var journal = req.body["journal"];
		console.log(typeof(journal));
		if (journal.length > 0){
			journalParam = "journal:" + "%22" + journal + "%22";
			queryUsed = true;
			searchInputArray.push({"Journal or Category": journal});
		} else {
			searchInputArray.push({"Journal or Category": "All Journals/Books"});
		}

		/* WORDS IN DOCUMENT PARAMETER */
		var words = req.body["words"];
		if (words.length > 0){
			wordsParam = words;
			queryUsed = true;
			searchInputArray.push({"Words in Document": words})
		}

		/* TITLE PARAMETER */
		var titleString = req.body["title"];
		var title = titleString.trimLeft();		
		if (title.length > 0){
			queryUsed = true;
			searchInputArray.push({"Words in Title":  title});
			var titleWords = title.split(" ");
			if (titleWords.length > 1) {
				titleParam = " title:" + titleWords[0];
				for (let i = 1; i <titleWords.length; i++){
					if (titleWords[i] != ""){
						titleParam += " AND title:" + titleWords[i];
					}
				}
			} else {
				titleParam = " title:" + title;
			}
		}

		/* TYPE PARAMETER */
		var type = req.body["type"];
		if (type != "Both"){
			typeParam = " type:" + type;
			queryUsed = true;
			searchInputArray.push({"Type of Literature":  type});
		} else {
			searchInputArray.push({"Type of Literature": "Journals and Books"});
		}

		/* FROM-DATE PARAMETER */
		var fromDate = req.body["fromDate"];
		if (fromDate.length > 0){
			var isValidFromDate = datePattern.test(fromDate);
			if (isValidFromDate){
				dateFromParam = " onlinedatefrom:" + fromDate;
				queryUsed = true;
				searchInputArray.push({"Search from:":  fromDate});
			} else {
				dateFromParam = "";
				dateFromParamInvalid = true;
			}
		}

		/* TO-DATE PARAMETER */
		var toDate = req.body["toDate"];
		if (toDate.length > 0){
			var isValidToDate = datePattern.test(toDate);
			if (isValidToDate){
				dateToParam = " onlinedateto:" + toDate;
				queryUsed = true;
				searchInputArray.push({"Search to:":  toDate});
			} else {
				dateToParam = "";
				dateToParamInvalid = true;
			}
		}
		
		/* YEAR PARAMETER */
		var year = req.body["year"];
		if (year != "none"){
			queryUsed = true;
			yearParam = " year:" + year;
			searchInputArray.push({"Year of Publication": year});
		}


		/* ACCESSIBILITY CHECK openaccess:true*/

		var checkboxValue = req.body["accessCheck"];
		if (checkboxValue == "1"){
			accessParam = " openaccess:true";
			queryUsed = true;
			searchInputArray.push({"Only Open Access": "True"});
		} else {
			searchInputArray.push({"Only Open Access": "False"});
		}

		/* COMPARE FROM-DATE - TO-DATE PARAMETER */
		if (isValidFromDate && isValidToDate){
			const fromSearch = new Date(fromDate);
			const toSearch = new Date(toDate);
			if (fromSearch > toSearch){
				searchDateInfo = `Invalid time limit: End time of the search parameters (${toDate}) is before the start time (${fromDate}).`;
			}
		} 

		for (let i = 0; i < searchInputArray.length; i++){
			var obj = searchInputArray[i];
			for (var key in obj){
				if (obj.hasOwnProperty(key)){
					console.log( "key:", key, " value:", obj[key]);
				}
			}
		}

		if (!queryUsed && !dateFromParamInvalid && !dateToParamInvalid){
			endpoint = "https://api.springernature.com/metadata/json?" + "&p=" + req.body["numberOfResults"] + "&api_key=" + API_KEY;
			const response = await axios.get(endpoint); //wait until this process is done before continue
			var result = response.data;

		} else if (!dateFromParamInvalid && !dateToParamInvalid) {
			endpoint = "https://api.springernature.com/metadata/json?q=(" + wordsParam  + journalParam + typeParam + titleParam + dateFromParam + dateToParam + yearParam + accessParam +")&p=" + req.body["numberOfResults"] + "&api_key=" + API_KEY;
			const response = await axios.get(endpoint); //wait until this process is done before continue
			var result = response.data;
			console.log(endpoint);
		}

		if ((dateToParamInvalid == true) || (dateFromParamInvalid == true)){
			generalJSO = {
				timeSearchInfo: "Invalid time search input.",
				inputParameter: [],
				totalFound: "-",
				articelsToDisplay: "-"
			}
			integerNum = 0;
		} else {
			generalJSO = {
				timeSearchInfo: searchDateInfo,
				inputParameter: searchInputArray,
				totalFound: result["result"][0]["total"],
				articelsToDisplay: result["result"][0]["recordsDisplayed"]
			}
		}

		var integerNum = parseInt(generalJSO["articelsToDisplay"]);
		
		if (integerNum > 0){
			for (let i=0; i < integerNum; i++){
				var abstract = result["records"][i]["abstract"];
				if (abstract == ""){
					abstract = "undefined";
				}
				var nextJSO = {
					publicationDate: result["records"][i]["publicationDate"],
					url: result["records"][i]["url"][0]["value"],
					title: result["records"][i]["title"],
					abstract: abstract
				}
				articelArray.push(nextJSO);
			}
		}
		res.render("index.ejs", {content: articelArray, contentInfo: generalJSO});
	} catch (error) {
		console.log(error.message);
		generalJSO = {
			timeSearchInfo: "Error: " + error.message,
			inputParameter: [],
			totalFound: "-",
			articelsToDisplay: "-"
		}
		res.render("index.ejs", { content: articelArray,  contentInfo: generalJSO });
	}
});

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
  });


function clear(){
	dateFromParamInvalid = false;
	dateToParamInvalid = false;
	queryUsed = false;
	wordsParam = "";
	journalParam = "";
	titleParam = "";
	typeParam = "";
	yearParam = "";
	dateFromParam = "";
	dateToParam = "";
	accessParam = "";
	searchDateInfo = "OK";
	searchInputArray = [];
	articelArray = [];
	generalJSO = {};
}
