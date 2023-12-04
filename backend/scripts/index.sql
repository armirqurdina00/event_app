-- Counts events per city, scrapeUrlStatus, and urlType where scrapeUrlStatus is 'PROCESSED' and urlType is 'event_url'.
select count(*) as numberOfEvents, city, "scrapeUrlStatus", "urlType"  
from scrape_url_e sue 
group by city, "scrapeUrlStatus", "urlType"  
having "scrapeUrlStatus" = 'PROCESSED' and "urlType" = 'event_url' 
order by numberOfEvents DESC;

-- Selects all from scrape_url_e where scrapeUrlStatus is 'PROCESSED' and urlType is 'search_url', and calculates time difference between nextScrape and lastScrape.
select *, (sue."nextScrape" - sue."lastScrape") as timeDiff 
from scrape_url_e sue  
where sue."scrapeUrlStatus" = 'PROCESSED'  and sue."urlType" = 'search_url' 
order by timeDiff asc ;

-- Sums the number of joins for each city in the group_e table.
SELECT 
    "group_e".location AS city, 
    SUM("group_e".number_of_joins) AS joinCount
FROM 
    "group_e"
GROUP BY 
    "group_e".location
ORDER BY 
    joinCount DESC;

-- Deletes duplicate events from the event_upvote_e, event_downvote_e, and event_e tables.
delete FROM event_upvote_e 
WHERE event_id IN (
    SELECT e1.event_id
    FROM event_e e1, event_e e2
    WHERE e1.event_id < e2.event_id
      AND e1.unix_time = e2.unix_time
      AND ST_DWithin(e1.location_point, e2.location_point, 50)
      order by e1.title
);

delete FROM event_downvote_e 
WHERE event_id IN (
    SELECT e1.event_id
    FROM event_e e1, event_e e2
    WHERE e1.event_id < e2.event_id
      AND e1.unix_time = e2.unix_time
      AND ST_DWithin(e1.location_point, e2.location_point, 50)
      order by e1.title
);

DELETE FROM event_e
WHERE event_id IN (
    SELECT e1.event_id
    FROM event_e e1, event_e e2
    WHERE e1.event_id < e2.event_id
      AND e1.unix_time = e2.unix_time
      AND ST_DWithin(e1.location_point, e2.location_point, 50)
);