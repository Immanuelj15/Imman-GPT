
import { search, SafeSearchType } from "duck-duck-scrape";

console.log("Testing Search...");
try {
    const results = await search("price of bitcoin");
    console.log("Search Success!");
    console.log("Count:", results.results.length);
    console.log("First Result:", results.results[0]);
} catch (e) {
    console.error("Search Failed:", e);
}
