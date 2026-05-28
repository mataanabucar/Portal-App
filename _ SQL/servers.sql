

SELECT  
b.businessid,--stage.*,
cf.instancetype,b.business,stage.ServerName,
sq.*
/* DISTINCT
sq.ServerName,sq.domain */
FROM   powersuiteweb.dbo.setup_coldfusion(NOLOCK) cf
	   INNER JOIN powersuiteweb.dbo.setup_company(NOLOCK) c ON c.companyid = cf.companyid
	   INNER JOIN powersuiteweb.dbo.setup_business(NOLOCK) b ON b.companyid = c.companyid
	   INNER JOIN powersuiteweb.dbo.setup_server(NOLOCK) stage ON stage.serverid = cf.serverid
																  AND cf.instancetype = 'stage'
	   LEFT JOIN powersuiteweb.dbo.setup_server(NOLOCK) sq ON c.sqlserverid = sq.serverid
WHERE  cf.instanceactive = 1
	--		and stage.servername like '%stage%'
	--and c.companyname like '%fuller%'
		--and b.business like '%aviation%'
			--and stage.ServerName = 'GSUSE1APP10V'
			and b.businessid = 1474
			
ORDER BY sq.ServerName;

/* SELECT distinct business FROM powersuiteweb.dbo.setup_business WITH (NOLOCK) 
where ExternalSubmit = 1 and Business not like '%vernova%' order by business; */

/* USE powersuiteweb;

update ltbEnvPriority
set closureid = null
where closureid in (7,8,9)


SELECT s.application, b.*
FROM   setup_app s(NOLOCK)
	   JOIN setup_businessapp ba(NOLOCK) ON s.appid = ba.appid
	   JOIN setup_business b(NOLOCK) ON ba.BusinessID = b.BusinessID
WHERE  s.application like '%safer%'
	   --AND b.BranchAbr LIKE '%Sourcing%'
	   AND BusinessActive = 1
ORDER BY Business; */

/* 
-- BUS-APP active
USE powersuiteweb;

SELECT b.*
FROM   setup_app s(NOLOCK)
	   JOIN setup_businessapp ba(NOLOCK) ON s.appid = ba.appid
	   JOIN setup_business b(NOLOCK) ON ba.BusinessID = b.BusinessID
WHERE  s.AppID = 3
	   AND b.BranchAbr LIKE '%Sourcing%'
	   AND BusinessActive = 1
ORDER BY Business;
 */

-- QA SERVERS
/* SELECT  stage.ServerName,cf.ServiceName,stage.ip
FROM   powersuiteweb.dbo.setup_coldfusion(NOLOCK) cf
	   INNER JOIN powersuiteweb.dbo.setup_company(NOLOCK) c ON c.companyid = cf.companyid
	   INNER JOIN powersuiteweb.dbo.setup_server(NOLOCK) stage ON stage.serverid = cf.serverid
																  AND cf.instancetype = 'qa'
WHERE  cf.instanceactive = 1

-- STAGE BY BUSINESS
SELECT  stage.ServerName,cf.ServiceName
FROM   powersuiteweb.dbo.setup_coldfusion(NOLOCK) cf
	   INNER JOIN powersuiteweb.dbo.setup_company(NOLOCK) c ON c.companyid = cf.companyid
	   INNER JOIN powersuiteweb.dbo.setup_server(NOLOCK) stage ON stage.serverid = cf.serverid
																  AND cf.instancetype = 'stage'
WHERE  cf.instanceactive = 1 and stage.ServerName not like '%GSIAD3STAGE%'
group by stage.ServerName,cf.ServiceName
order by cf.ServiceName

-- STAGE BY SERVER
SELECT  stage.ServerName
FROM   powersuiteweb.dbo.setup_coldfusion(NOLOCK) cf
	   INNER JOIN powersuiteweb.dbo.setup_company(NOLOCK) c ON c.companyid = cf.companyid
	   INNER JOIN powersuiteweb.dbo.setup_server(NOLOCK) stage ON stage.serverid = cf.serverid
																  AND cf.instancetype = 'stage'
WHERE  cf.instanceactive = 1 and stage.ServerName not like '%GSIAD3STAGE%'
group by stage.ServerName
 */

