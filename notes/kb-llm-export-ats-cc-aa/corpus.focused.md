# Action Item Generator CFC - How to use
Content ID: 1663
URL: https://tools.benchmarkdigital.com/kb/#content/1663
Products: Action Tracking System
Type: Guides
Last Modified: 2023-09-06 22:51:32
Author: Ivan Chavez
Tags: Basic,Programming Language
Org Tags: Product Development and Operations
File LocationThe main file path is: gsportal/cfc/aigenerator.cfcSending dataThere is another file located in gsportal/aigenerator.cfm where it is possible to create or update action items , it works using dynamic url parameters, so it is possible to send only the necessary values. It is important to mention that there is a validation to refuse requests if the values for item type (typeitem), assigned person (devitem) and details (issueitem) are missing , with this it is assured that the action item will have the basic values.If the previosly mentioned values were sent , the validateRequest method will be executed. This is the complete list of arguments and their types allowed to be sent to the request (not all of them need to be sent):formType (nvarchar)appItem (nvarchar)Requester (nvarchar)devItem (nvarchar)originItem (nvarchar)accessName (nvarchar)typeItem (nvarchar)subtypeItem (integer)isbaseencoded (bit)issueItem (nvarchar)dueDate (date)dueDate_orig (date)devItem_orig (nvarchar)history (nvarchar)busitem (nvarchar)status (nvarchar)closeitem (nvarchar)actualeffort (real / numeric)behalfofitem (nvarchar)prioritydropdown (int)priorityrequest (int)category (nvarchar)assigntoemail (nvarchar)submitter (nvarchar)closeitem (nvarchar)closedate (date)editID (In case of update, integer)ProcessAfter hitting the validateRequest function, this will check if the editID is not empty, if that is the case it is assumed that the user is trying to generate a new Action Item, so the addActionItem will be called and all the initial arguments will be send to it , then the function will do some validations then an insertion of the data. The update function is pretty similar to the insertion , but in this case we have an existing value for the editID argument , so the updateActionItem function will be called and will also do some validations first of all , then subsequently update the action item to which the id refers. In both cases the addActionItem and updateActionItem functions will return the editID or the Action Item Id, if the returned value exists then the sendActionItemEmail function will be triggered in order to send the corresponding email.Then if everything went well, a window with the item in question will open.
---

# Action Item Generator CFC - Remote Calls Via Ajax
Content ID: 2313
URL: https://tools.benchmarkdigital.com/kb/#content/2313
Products: Action Tracking System
Type: Guides
Last Modified: 2024-07-25 18:12:18
Author: Ivan Chavez
Tags: Basic
Org Tags: Platform Engineering and Operations
The AI Generator (action item generator) cfc has a main function (validateRequest) where the addActionItem or the updateActionItem functions are called and triggered depending on the passed arguments, this is more likely to be requested through out Coldfusion pages but there is another way to use this function for different types of integrations in the internal apps portfolio. By using Ajax calls we can send the request to the validateRequest function and be able to insert or update action items.ValidateRequest Overview We can say this is the main function of the AI Generator cfc, since from here we can send all the necessary arguments to the addActionItem or updateActionItem functions, if the arguments contain the EditID it is assumed that it is an update if not an adding, after these functions are triggered and the process is done both will return the action item id, then the email function will be called to send the corresponding mail.Example from Ajax callThis example from above was built for the State of the union report , in this case we had a button where the users can create action items as CRM to-do's , most of the values were obtained by form inputs but we can add static values. The values showed are the basic ones to insert a new item, in case we want to edit an existing AI we can use the editID for that item with the accepted arguments showed in the KB article for the full AI Generator cfc description. If everything was ok on the call the validateRequest function will always return the action item id, so in that case we can validate the request response as we did on the code after the success part.
---

# Action Item Tagging Process and Response Types
Content ID: 610
URL: https://tools.benchmarkdigital.com/kb/#content/610
Products: Action Tracking System
Type: Guides
Last Modified: 2019-05-17 11:26:42
Author: Erin Sullivan
Tags: Pending Assignment by Org
Org Tags: Strategic Relationship Management
In
an effort to ensure not only that the right team member is handling an item,
but also that we are responding appropriately and effectively, we have a new
Action Item tagging process. Throughout the day, the Support and Operations team reviews items
to determine the type of response required and then and re-assigns them based
on the category they fall under.Please
see below for the breakdown on what each type means/requires. This guidance
text can also be found in the AI.
 Response Type 1
 – This is a basic HelpMe request and can be answered by any member of the
 team. Use the provided quick response for initial acknowledgment. 
 Response Type 2
 – This type of request requires more than basic knowledge of our
 applications/user. An ABA could assist in troubleshooting/background on
 the request but the Account Manager should be involved as well as
 reviewing any communication before it goes to the user. Use the provided
 quick response template for initial acknowledgment.
 Response Type 3
 – This is a high level/strategic request that requires the attention and
 care of the Account Manager and Relationship Leader. By default, all
 communications with the requester should be led by the Account
 Manager/Relationship Leader, especially in the initial phases of the
 discussion. Less experienced team members may shadow the response
 process. Use the provided quick response for initial acknowledgment.

Once
a type is selected it will appear below the request type in the Portal main
view. You will also notice Quick Response guidelines will also populate once a
type is selected. Make sure to reach out to the user and use the quick response
guidance provided for ALL requests going forward.
---

# Action Items Requests Fin Ops Type
Content ID: 3118
URL: https://tools.benchmarkdigital.com/kb/#content/3118
Products: Action Tracking System
Type: Procedure
Last Modified: 2026-02-11 13:45:02
Author: Mariana Lorenzo
Tags: Advanced
Org Tags: Finance and Strategic Initiatives
Binder IDs: 926
​
 ​
 ​
 ​
 ​
 ​
 ​​
 ​
 ​
 ​​
 ​
 ​

 ​

 ​
---

# Action Tracking System - Batch XLS Upload: Internal FAQ
Content ID: 1339
URL: https://tools.benchmarkdigital.com/kb/#content/1339
Products: Action Tracking System
Type: Guides
Last Modified: 2022-06-13 09:24:49
Author: Steven Walker
Tags: Pending Assignment by Org
ATS XLS Nightly Cache:A scheduled task is performed nightly to generate and store business-specific upload templates for immediate availability. This is done to prevent timeouts caused by writing business-specific data to the base template each time it's downloaded by user. Most of the timeouts occurred during training sessions when dozens of users would attempt to download the xls around the same time.If a timeout ever occurs from a user downloading this xls, first check that there is a scheduled task (name: "ATS Upload Template Cache") set up for the business.How the scheduled task works:When the task starts each night, upload.cfm is hit from the ats app directory. From there, updateUploadTemplate.cfm is included which calls the scheduler tags. Once the scheduler logic is included, "help/center/ats/ats_upload_template.cfm" is included to begin the cache process.How the cache works:"help/center/ats/ats_upload_template.cfm" is the file that generates the xls file with business information. It is the file called when users click link to download the ats upload template. The generation code should only run under the following conditions:1. The scheduled task has called the file.2. The base xls file, ats_upload_template.cfm or "powersuite/library/cfc/apps/ats/exceltemplate.cfc", file has been updated since the last cache.3. Forced to run with url.To generate the file and store to cache, the normal generation code is run, but instead of proving the xls to the client, the file is stored in a temp directory. The temp directory path should be available from the UI and scheduled task servers.
---

# Action Tracking System - Frequently Asked Questions
Content ID: 924
URL: https://tools.benchmarkdigital.com/kb/#content/924
Products: Action Tracking System
Type: Guides
Last Modified: 2026-04-01 14:31:45
Author: Kade Medd
Tags: Contributor,Support
Org Tags: All Team
Binder IDs: 908
Below are answers to questions that
often come up when demoing or deploying Action Tracking System. These questions, together with the App Dossier and Implementation Playbook planning questions, provide a comprehensive overview of the Action Tracking System. 1) What other Benchmark | Gensuite applications does ATS Integrate with?​We like to say that “all roads lead to ATS” because it is integrated with so many of our modules. ATS acts as a single repository for follow-up actions originating from modules such as Inspection Tool, Concern Reporting, Compliance Calendar, Incidents & Measurements, Safety Observations, and more. When exporting an action from another Benchmark | Gensuite application, a link is formed between the two records so that you can have a link back to the originating record & vice versa. 2) Can I integrate ATS with my maintenance system (i.e. Maximo)? Yes, Benchmark | Gensuite has
experience integrating with maintenance systems including Maximo and have a
number of options. 1) If you don't want to fully integrate into an
external system you can simply just add the ATS Finding ID into Maximo for
reference. 2) As a custom project we can do a simple integration by sending
over an ID to a system to trigger a new record through an API or 3) We could do
a 2 way integration where we send the ATS info to the system and then that
system talks back to ATS for closure. 3) Can I have someone verify the closure of an action before it is formally closed out in the system? Yes, with the Closure Verifier feature in ATS, users can select on an action-by-action basis a user who will verify that the action was completed properly once the responsible person has submitted their action for review. The Closure Verifier will be sent an email and they can choose to accept or reject the closure. If rejected, they can send comments back to the responsible person for additional follow-up 4) Can I assign actions to contractors?  Do they have to have user accounts to close out their actions?There are a couple of ways that our customers are engaging contractors with action item management. If the contractor has a high-level of involvement, like a consultant or a temporary worker, companies may choose to set that contractor up with their own Benchmark | Gensuite account and assign actions directly to that individual. We also offer an extension feature called “indirect closure” – when an action is assigned to a contractor, they will receive an email attachment that will allow them to close or add in-progress notes without having access to the Benchmark | Gensuite platform and will be able to close it out directly from the attachment in that email. 5) Can I create sub-actions and assign those sub-actions to different people?Yes, the sub-corrective actions feature allows you to do this and as an option you can also determine if the action should automatically close once the last sub-action is complete.  6) Can I conduct a Root Cause Analysis (RCA) on an action item?Yes – this is typically conducted through the Corrective and Preventative Action feature, which can be configured in a number of different ways. Usually this is a requirement for the Quality function, but sometimes EHS functions will conduct these types of assessments for certain types of actions. There are a couple of different implementations of this feature – the most basic being free text fields for investigation & root cause details, whereas other configurations include dropdown lists. 7) Can I rank my actions based on risk level?Yes, we have several subscribers who have an additional field for assigning a risk category (e.g. high, medium, or low). Some of them have also linked the closure category (completion time-frame) to the risk category selection. 8) Can I assign the same action to multiple sites at once?  Who does it get assigned to?  Can I see if every site has completed those actions? Yes, users with higher levels of permissions can submit action items for multiple sites. Under the submit button at the bottom of the Add New Action page, there is a link that can be used to select multiple sites as well as default the responsible person to the site’s respective Site Lead, Manager, or Ops Lead.9) Is it possible to enable only ATS without activate Compliance Calendar for different sites?Yes, there's a setup variable configuration called splitAppActivationATSCC. By enabling it, the applications will appear as separate apps in SMT, allowing you to activate them independently for the sites where needed.
---

# Action Tracking System: Internal FAQ
Content ID: 1326
URL: https://tools.benchmarkdigital.com/kb/#content/1326
Products: Action Tracking System
Type: Tips
Last Modified: 2026-06-23 08:45:48
Author: Anthony Cox
Tags: Best Practice,Contributor,Contributor,Contributor
Org Tags: Product Development and Operations,Subscriber Delivery and Operations
Binder IDs: 33|360|825|908
Welcome to the ATS Internal FAQ Article! Here you will find very commonly asked questions about how ATS works/integrations/complexities!ATS XLS Batch Upload Template Internal FAQLong Term Verification (Workflow and Activation)ATS General FAQs​Permissions Model: Access Levels, Special Rights and Feature Unlocks​List of apps that can be exported to ATSATS DTI(Historical Large Scale Data Transfers)​​CS Agent(Hackathon)​﻿What are the lookup tables used in ATS?﻿ltbFindingType - Action Type ltbAuditType - Audit/Action Type or Action Origin - (Primarily used in ATS, but other apps such as IT, RA and CR also uses it for ATS integration, so consult with other app team as well before doing data updates)ltbCategory - Action Category - (Primarily used in ATS, but other apps such as IT, RA and CR also uses it for ATS integration, so consult with other app team as well before doing data updates)ltbClosure - Closure Category - (Primarily used in ATS, but other apps such as IT, RA and CR also uses it for ATS integration, so consult with other app team as well before doing data updates)ltbEnvPriority - Risk CategoryHow do I map or create connection between Risk Category and Closure Category?We need to map the ClosureID column from ltbEnvPriority to the corresponding ClosureSortNo. In below eg. the first row, ClosureID = 6 will pick closure category with ClosureSortNo = 6 which will trigger 7 day closure on the add form.To remove this link, just set closureID to null in ltbEnvPriority. The user has received past due email but the action has CloseDate before the Closure Due Date?The most likely cause in this scenario is that user has closed the action later but while closing the action they have chosen to back date the close date. We can confirm from the action history the actual closure date. If we want to block changing the close dates , please reach out to the development team for the efforts.Business is asking for data extracts, do we have any queries for it?We have the templates and queries added here for most apps. Doc Man link​To remove this link, just set closureID to null in ltbEnvPriority. ﻿How do we delete/archive bulk actions from ATS from backend?ATS does not have option for archiving the actions. When it is deleted the record gets moved from tblAudit to tblAudit_Deleted. It is advisable to delete actions from front end as there are other dependent tables for which deletion needs to be performed which is handled in front end. If we still need to do bulk delete it is advisable to then perform bulk closure for actions instead of delete by providing closedate, closedby and closecomment(we should also enter the HM # here for reference). And of course need to perform the RA before doing any data updates.﻿When linked to a Calendar task, the Action Title stays in sync. This is correct, if there's a link to a calendar task and it can still find said task, the Action Title should populate to match the Calendar task name.On Action Tracking System, customers noticed that level 0 users were
able to edit or close the actions and once they submitted any change their
level permissions went from 0 to 1.This is correct, if the responsibility persons do not have any permission, by default
they are granted level 1 permission as a standard. This will enable them to work immediately in case they show up as
responsible person of an action finding assigned by a supervisorUsers are not receiving Outstanding Email?The
outstanding ATS report emails is sent to orgAdmins for the org, CorpLeadEmail
and Outstanding email cc list setup in setup file. Let PDD team know specific email ids if any which needs to receive this email.What is the use of Measurement Date in reporting or data mining?Measurement Date is used to compare with Audit Date to determine the Action Status based on it. By default it is set to today's date. Lets see an example belowWhen Measurement Date selected as 21-Apr-2023When Measurement Date selected as 15-Feb-2023, we can notice it shows the status as Open in the report, because on 15-Feb, the closure due date is in future as it is in April﻿Can I move actions from one site to another? Currently you can not "move" from the front end. You CAN "copy" using site replication in the add/edit page. To Move it will need to be a DB update activity and the following questions need to be answered: 
 Does the site specific ID already exist in the site
 you're moving it to? If it does you will need a new ID
 Does the new site have the same
 depts/subdepts/workstations/buildings as the old dept?

 Yes – subcoeid will still need updated in the move to
 point at the new subcoeid in the new site
 No – Either add the missing records OR NULL out all
 these columns

 Does the record have attachments? If yes – Attachments
 team may need to help. And update the referenceID if the answer to #1 is
 YES. 
 Other random things like custom fields/sub corrective
 actions/etc.
 Do users related to these actions need permissions
 copied?I want to submit actions to multiple sites, but other site are not visible?The sites are listed or shown only for which you have permissions to add actions. I have added actions through submit to multiple sites, but other site users have not received any email?Email generated immediately for site where initial finding was logged. For all replicated sites, emails will be sent during next upcoming batch.Schedule task needs to be created for the same by submitting the IT ticket and upto 3 slots/tasks from following can be selected when this batch runs. All time are in ET.

 ATS
 Replication Emails 1(Daily)

 12:00 AM

 ATS
 Replication Emails 2(Daily)

 8:00 AM

 ATS
 Replication Emails 3(Daily)

 4:00 PM

 ATS
 Replication Emails 4(Daily)

 10:00 AM

 ATS
 Replication Emails 5(Daily)

 12:00 PM

 ATS
 Replication Emails 6(Daily)

 2:00 PM

 ATS
 Replication Emails 7(Daily)

 8:00 PM

 ATS
 Replication Emails 8(Daily)

 4:00 AM

Does ATS action gets archived if dept is archived?No, even if dept is archived and site is unarchived, the underlying action is not archived. The action can be still data mined and used in metrics. However, if on data mining and ATS homepage dept filter if we want to show archived dept that can be done by standard support item. Irrespective of this, if dept filter is not selected the report shows action for all depts including the archived ones. Can we close actions from backend. What would be the sample query?Following is the sample query to close action from backendUPDATE dbo.TblAudit Set Status = 'Closed', CloseDate = '2023-07-07 00:00:00.000', ClosePerson = 'Shiva Prasad A', CloseComment = 'Closing as part of GE Appliance QDS’s site archive with reference to HelpMe # 185171' UpdateDate = getdate() , UpdateUser = 'Shiva Prasad A', UpdateHistory = (UpdateHistory + '|' + replace(convert(varchar, getdate(), 22), ' ', ',') + '|' + 'Shiva Prasad A' + '|' + 'Close')WHERE tblAuditID in(1235)We do not see Manage option tab present in ats homepage menu?The Manage option tab is shown if any of the menu links from that is available such as Audit Assistant, Audit Planner, Manage List(List Manager enabled from SMT) is activated.Explain about CAPA?Yes – this is typically conducted through the Corrective and Preventative Action feature, which can be configured in a number of different ways. Usually this is a requirement for the Quality function, but sometimes EHS functions will conduct these types of assessments for certain types of actions. There are a couple of different implementations of this feature – the most basic being free text fields for investigation & root cause details, whereas other configurations include dropdown lists. When we add CAPA fields by standard, Investigation Details, Root Cause and Effectivity Date are shown. When CAPA is edited, Effectivity Information field is shown as well.Root Cause Fields has 2 versions, Free text: By default free text version is activated.Dropdown option: In this the root cause is a dropdown option with capability of adding 2 more levels of dependent dropdown in RootCause 1 and RootCause2 option based on JSONRootCause config.For PDD reference CAPA fields

 Label
 Label Value
 Column

 investigationDetailsLabel
 Investigation Details
 InvestigationDetails

 effectivityDateLabel
 Effectivity Date
 Optional_4 

 effectivityInformationLabel
 Effectivity Information
 Optional_1 

 RootCauseLabel
 Root Cause
 Optional_3

 RootCause1Label
 Basic Cause
 Optional_6 

 RootCause2Label
 Near Root Cause
 Optional_7 
 How to retrieve the deleted action from ATS?The deleted action in ATS is moved from tblAudit to tblAudit_deleted table. To retrieve that we can use following query but need to take help of DB team to get it executedSET IDENTITY_INSERT tblAudit ON;insert into tblaudit (Orgname,Location,ID,AuditName,AuditDate,AuditType,FindingType,Category,Citation,NumItems,RepeatItem,ClassificationType,Classification,COE,Bldg,Workstation,ResponPerson,Description,CorrectiveAction,ContactPerson,ContactPhone,CloseDate,CloseComment,ClosePerson,Status,ClosureDueDate,Optional_1,Optional_2,Optional_3,Optional_4,Optional_5,RefType,RefID,UpdateDate,UpdateUser,UpdateHistory,HighPriority,VerifyPerson,VerifyDate,VerifyComment,DaysBeforeReminder,VerifyByDate,SubCOEID,MultiCC,InvestigationDetails,CAPARequired,MXWasChecked,MXHasDouble,MXWasUpdated,MXEncode,tblAuditID,Optional_6,Optional_7,Optional_8,ExternalSubmit,Employee,AutoEscalation,EscalateDueDate,AutoEscalationStep,ReplicateTblAuditID)select Orgname,Location,ID,AuditName,AuditDate,AuditType,FindingType,Category,Citation,NumItems,RepeatItem,ClassificationType,Classification,COE,Bldg,Workstation,ResponPerson,Description,CorrectiveAction,ContactPerson,ContactPhone,CloseDate,CloseComment,ClosePerson,Status,ClosureDueDate,Optional_1,Optional_2,Optional_3,Optional_4,Optional_5,RefType,RefID,UpdateDate,UpdateUser,UpdateHistory,HighPriority,VerifyPerson,VerifyDate,VerifyComment,DaysBeforeReminder,VerifyByDate,SubCOEID,MultiCC,InvestigationDetails,CAPARequired,MXWasChecked,MXHasDouble,MXWasUpdated,MXEncode,tblAuditID,Optional_6,Optional_7,Optional_8,ExternalSubmit,Employee,AutoEscalation,EscalateDueDate,AutoEscalationStep,ReplicateTblAuditIDfrom tblaudit_deleted with (nolock)where TblAuditID = #tblAuditIDHere#SET IDENTITY_INSERT tblAudit OFF;ATS app is activated but is not shown or active for current site / api.get('apptools').isAppActive(appID=3,scopeLevel="Site",scopeID=siteid) returns falseFirst of check setup_scopeapp table and most likely entry is missing for the scopeuse PowerSuiteWeb_Preprodselect * from setup_scopeapp with (nolock)Second if the entry is missing check for Company Maintenance Task is setup or not which populates that table with a script. Get that working with IT team and give it a day to run and it should populate the data as needed.If it still doesn't shows up then reach out to PDD teamHow the closure verification process works in ATS (Action Tracking System):## Closure Verification Process in ATS

The closure verification process is a quality control mechanism that ensures proper review and approval of closed findings or actions. Here's how it works:

### Process Overview

1. **Designation of Closure Verifier**
 - A closure verifier is designated at the organizational level (site, department, etc.)
 - The system uses the closure verifier designated at the "lowest level" associated with the case
 - For example, if a case is at sub-department level but only has a verifier at the parent department level, that department-level verifier will be used

2. **When Closure Verification is Triggered**
 - The process is triggered when follow-up activities are marked as "Closed"
 - It's an optional feature - if no closure verifier is designated, the verification process is not triggered
 - Certain finding types (Major/Minor findings) may require closure verification when closed

3. **Email Notifications**
 - When a case/finding is closed and requires verification, an email is automatically sent to the designated closure verifier
 - The verifier receives notification that their review is required

4. **Verifier Actions**
 - **Approve Closure**: The verifier can approve the case closure
 - **Reject Closure**: The verifier can reject the closure and reopen the case

5. **Approval Process**
 - If the closure verifier **approves** the case closure:
 - An approval email is sent to multiple stakeholders including:
 - Supervisor
 - Designated Site/Department EHS Lead
 - Case Submitter
 - Distribution list subscribers
 - Closure Verifier (CC)

6. **Rejection Process**
 - If the closure verifier **rejects** the case closure:
 - The case is automatically reopened
 - The original responsible parties are notified
 - A rejection comment explains the reason for rejection

### Key Features

- **Verification Status Tracking**: The system tracks verification status as "Pending", "Complete", "Not Required", etc.
- **Due Date Management**: Uses verification dates and tracks past due verifications
- **Access Control**: Only designated closure verifiers (or business administrators) can perform verification actions
- **Audit Trail**: All verification actions are logged and tracked
- **Integration**: Works with findings, corrective actions, and other ATS components

### Configuration Options

- `RequireClosureVerification`: Can be enabled/disabled per business unit
- `UseVerificationDate`: Enables scheduled verification dates
- `RequireClosureVerificationFindingType`: Specifies which finding types require verification
- Various email templates and notification settings

This process ensures that critical findings or actions receive proper management review before being considered fully closed, adding an additional layer of oversight to the closure process.## Export from ATS to CI Implementation
Based on my analysis of the code in audaction.cfm, here's how the export from ATS (Audit Tracking System) to CI (Continuous Improvement) works:

### Trigger Conditions
The export to CI happens when:
- CI is active for the site (`variables.isCIActiveForSite`)
- The form action is "ExportCI" (`FORM.ACtion IS "ExportCI"`)

### Export Process Workflow

1. **Initial Setup**
 ```coldfusion
 <CFSET audit = createObject("component","#Request.Library.CFC.DotPath#.apps.ats.audit").init(ODBC="#ODBC#", AuditHome="#AuditHome#")>
 <CFSET qAudit = audit.getAudit(tblAuditID="#audit.getAuditID(SiteID="#FORM.SiteID#", ID="#FORM.ID#")#")>
 ```
 The system retrieves audit information using the ATS audit component.

2. **Data Preparation**
 - Gets correction data from either the citation field (if repurposed) or the corrective action field
 - Retrieves containment data from the corrective action
 - Checks for additional correction/containment data in the Extensions_Data table

3. **CI Export Process**
 If the finding type is in the CI export list (`CI_LOCK_ATS_FindingType`):
 - Determines analysis type (NCA or RCA based on finding type)
 - Sets prioritization level (Medium for NCA, High for RCA)
 - Creates CI record using the `apptoci_email.cfm` module with comprehensive audit data

4. **Record Linking**
 ```coldfusion
 <cfset getlink = createObject("component","#Request.Library.CFC.DotPath#.apps.ci.ci").init(ODBC="#ODBC#").linktoci(apphome="#CIHome#",reftype="ats",refid="#qAudit.ID#",siteid="#qAudit.SiteID#")/>
 ```
 Creates a link between ATS and CI systems to maintain traceability

5. **Finding Lock**
 Once exported, the ATS finding becomes locked until the CI process (NCA or RCA) is complete.

### User Interface Implementation

**Two ways to trigger the export:**

1. **Direct Export**: Uses JavaScript function `LoadCI()` to call `audaction.cfm?siteid=X&id=Y&Action=ExportCI`

2. **Confirmation Dialog**: Shows a warning message:
 ```javascript
 "Once exported, this finding will be locked and will not be able to be updated. 
 Are you sure you want to export this finding to Continuous Improvement?"
 ```

### Export Button Implementation
The export functionality is presented through a button that calls:
```javascript
LoadCI('audaction.cfm?siteid=#siteid#&id=#id#&Action=ExportCI&init=#REQUEST.User.AccessID#');
```

The system also includes validation to prevent closing findings that require CI export but haven't been exported yet, ensuring proper workflow compliance between ATS and CI systems.

This implementation provides a controlled, auditable process that maintains data integrity between the two systems while ensuring users understand the implications of exporting findings to CI.​How to enable ATS without activate Compliance Calendar for multiple sites?There's a setup var configuration called splitAppActivationATSCC. By enabling it, the applications will appear as separate apps in SMT, allowing you to activate them indepentently for the site where needed.​How can we replicate application setup and configurations from one business to another?Step 1: Migrate Customization Files from Source to Target Business

Copy all customization files related to the source business (identified by BUSID in file names or content, e.g., custom JS files) to the target business.

-Replace the source BUSID with the target BUSID in:
File names
File contents
Maintain the same folder structure
Create files/folders if they don’t exist
Do not overwrite existing files without confirmation

Automation prompt:
BASE_PATH=DevMumbai/SymriseAppSetup/
SOURCE_BUSID=1248
TARGETS=(AmeriTerpenes LLC,2200)
SCAN_DIRS=audit 
Under BASE_PATH, scan audit/ and calendar/ for all customizations for SOURCE_BUSID; replicate path, filename, and content for each TARGET_BUSID with token-safe replacement; log found/created/skipped; never overwrite without confirmation.Step 2: Verify and Sync Business Setup Files

Check whether the setup files for the source and target business are identical in the stage environment.

- Navigate to the source business setup file path:
 `\\<StageServer>\Business\...\<App>\setup<app>.cfm`
 (Example: `GSUSE1STAGE10V\AdaniCompany\adani\ehs\audit\setupaudit.cfm`)
 Locate the corresponding setup file for the target business Go to EHS or QLTY folder based on the subscribed module Compare both files: - If differences exist, copy the setup file from the source business to:
 The target business server > setup file
 And, the default stage server (20V stage or equivalent)-- ATS Homepage:How can we rename the “Unit/Sub-Dept” field to “Unit/Area” for the destination business (to match the source business)?This requires updating the centerDeptLabel variable in SMT. Request the SMT team to configure the variable: centerDeptLabel = Unit/Area
This will update the field label on the ATS Homepage from “Unit/Sub-Dept” to “Unit/Area”.-- ATS Add Action form:1)How can we add the missing “Additional Reminders” field and enable manual selection of the Closure Due Date in the ATS Add Action form?This is due to missing custom.js files from the source business. Deploy the source business custom.js files to the destination business to enable both the “Additional Reminders” field and manual Closure Due Date selection.

2)Two asterisks displayed for the closure due date fieldThis is applicable to entire business not specific to Calendar, so need to reach out to IT team to set this.-- ATS – Data Mining:1.Add missing fields: World Region, CountryAs per the current code logic, the filters are not displayed when a dropdown contains only a single option. Since “World Region” and “Country” each have only one available value, the condition fails and the filters are not rendered on the Data Mining page. These filters will appear only when additional options are added to the respective dropdowns.-- ATS Reports:1)Activate Site Status Report for a businessshowSiteStatusReportForDemo - Set the variable as true for the required business in the setup variable portal.

2)Under Reports > Application Manager, Personal Alerts: Compliance Assurance Report is missing-- Indirect Form Submission:EX: Select externalsubmit,* from setup_business with (nolock)
where businessid in (1145,2204)(1145 - Source busid, 2204 - destination busid)​How are the dropdown values with * and ** currently managed in the system?​🔍 Full Analysis: ATS Audit Type * and ** FlagsHere is a detailed answer to each of your questions, based directly on the code in audfinding.cfm and CustomReport.cfm.1️⃣ How Are the * and ** Values Managed?These are not visual labels stored in the database — they are appended at render time by the code. The exact logic from audfinding.cfm:coldfusion<cfset sAdd = "">
<cfif PriorityMetric eq 0>
 <cfset sAdd = "*">
</cfif>
<cfif MetricExclude NEQ 0>
 <cfset sAdd = "**">
</cfif>
<option value="#AuditName#">#AuditName##sAdd#</option>
So the flag shown to users is driven by two columns in the ltbAuditType database table:ColumnValueDisplayPriorityMetric0 (false)Shows * after the nameMetricExcludenon-zeroShows ** after the nameThe same logic also appears in CustomReport.cfm for the Data Mining dropdown.2️⃣ Historical Context — GE Reporting Standards?Yes. The code comment in CustomReport.cfm directly states:"(2) Actions from Audit Types marked with * or ** are automatically excluded from Metric rollups run before 1-Jul-06, and only those marked with ** are excluded from reports run after 1-Jul-06."This is legacy GE metric reporting logic dating back to at least July 2006. It was designed to distinguish audit types that were not meant to count in standard compliance metrics — for example, auto-export types from Reg Auditor or Framework tools.3️⃣ Which Reports Are Impacted?The flags affect behavior in these areas:Metrics / Custom Metrics page — * types were excluded from rollup calculations before Jul 2006; ** types are still excluded from metric rollups todayData Mining (CustomReport.cfm) — The dropdown labels show */** as a visual warning to usersCharts — Same audit type list is usedThe audfinding.cfm Add/Edit form — The dropdown label shows the flag so users know when selecting these typesThe ** flag (MetricExclude != 0) is the only one that still actively excludes data from metric rollups today. The single * (PriorityMetric = 0) is now mainly informational.4️⃣ Maintenance and Updates — What's the Process?Since the flags are database-driven columns in ltbAuditType, updating them requires a database update, not a code change. The process would be:Identify the ltbAuditTypeID for the audit type to be changedRun a DB update to set PriorityMetric or MetricExclude to the desired valueThe UI will automatically reflect the change on next page loadAdding a brand new audit type also requires a DB insert into ltbAuditType, which is a standard support/data team activity. No code changes are needed for either scenario.5️⃣ Effort and RisksTaskEffortRiskChange */** flag on existing audit typeVery Low — DB update onlyLow — but verify metric reports before/afterAdd a new audit typeLow — DB insertLow — same as aboveRemove */** logic entirely from the UIMedium — code change in audfinding.cfm + CustomReport.cfmMedium — old GE customers may rely on the visual indicatorChange which types are excluded from metric rollupsLow (DB) but High business riskHigh — metric history and rollup totals could shift significantlyThe biggest risk is changing MetricExclude on any audit type that has historical data, as it could alter how past metrics were calculated and potentially change compliance reporting numbers.
---

# Action Tracking System: Website Solution Advisor AI
Content ID: 3392
URL: https://tools.benchmarkdigital.com/kb/#content/3392
Products: Action Tracking System
Type: Program
Last Modified: 2026-05-07 23:07:29
Author: Lindsay Rickert
Tags: A.I.,Advanced,Automation
Org Tags: Platform Engineering and Operations
Binder IDs: 976
Action Tracking System

 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​​
 ​
 ​

 ​

 (link: https://benchmarkgensuite.com/app/action-tracking-system/) 

 Corrective
 Action Tracking Software

 Corrective and
 preventative action (CAPA) management software to build accountability and
 improve communications.

 ​

 Why
 Action Tracking System?

 To
 ensure a safe, secure work environment, identify and address corrective actions
 generated from routine audits, inspections, facility walk-throughs, and
 incident investigations in a timely manner.

 · 
 Gain Transparency into Tasks

 o Manage action item
 responsibility assignments and completion tracking.​

 · 
 Automate Communications

 o Communicate action
 item details via automated/scheduled email notifications.​

 · 
 Engage Team Members

 o Empower and unify
 teams with mobile, batch upload, and multilingual capabilities.​

 · 
 Trend Data for Insights

 o Mine compliance
 status data and easily identify systemic issues with advanced charting and
 reporting.​

 · 
 Integrate Seamlessly

 o Connect with the
 Corrective Action & Preventative Action (CAPA) and Incident Management
 solutions for end-to-end management of concerns, incident investigation, and
 corrective action assignments.

 Features & Benefits​

 Engage Teams and Ensure Timely
 Action with Corrective Action Tracking Software​

 Manage and drive closure of actions related to audit compliance,
 incident management, change management, quality management, responsible
 sourcing, and security management activities.

 · 
 Simplify Corrective Action Processes​: Ensure obligation completion
 with comprehensive management of corrective action items, audit findings,
 assignment responsibility, and closure due dates.​

 · 
 Create a Safe and Sustainable Workplace​: Increase workplace safety and
 sustainability by analyzing corrective action trends and identifying systemic
 issues. ​

 · 
 Create Complete Transparency​: Seamlessly integrate with other Benchmark Gensuite
 applications to gain the visibility and control needed to see corrective action
 items to closure on time.​

 ​
---

# Apps that can be exported to Action Tracking System(ATS)
Content ID: 1990
URL: https://tools.benchmarkdigital.com/kb/#content/1990
Products: Action Tracking System
Type: Guides
Last Modified: 2024-06-26 06:52:26
Author: Loveena D'Souza
Tags: Action Tracking System,Basic,Weekly PDD Spotlight
Org Tags: Product Development and Operations,Subscriber Services Operations
Applications that can be exported to ATS, I&M or other apps can have more granular setup, can reach out to ATS team for additional details

 I&M
 (Event, Injury/Illness, Initial Injury Report, NON, Penalty, Near Miss, Five why)

 Concern Report

 Calendar

 Reg Auditor

 Inspection Tool

 Audit Planner

 Audit Assistant

 Safety Obs

 SDS

 Quality Escape Reporting

 Security Incident

 GEEHS Transaction Tracker

 Profiler

 SAFER

 MOC Manager

 ACE

 QCR

 ESC/Framework 2.0

 Scorecard

 Safety Dialogue,

 IH

 Ergo

 SRA

 Risk Registry

 Safe Work Permit

 ATS
---

# ATS - DTI historical ID setup
Content ID: 3323
URL: https://tools.benchmarkdigital.com/kb/#content/3323
Products: Action Tracking System
Type: Guides
Last Modified: 2026-05-06 11:52:02
Author: Victor Ortiz
Tags: Maintenance
Org Tags: Product Development and Operations
Binder IDs: 266
ATS - DTI Historical IDs Configuration Guide

This scrolls is intended to guide you through the mystical ritual of ATS - DTI Historical IDs configuration. Follow the steps wisely to ensure the data spirits remain appeased.

 The "Why"

 Typically, when importing historical data, businesses bring their own internal IDs. Currently, DTI doesn't auto-magically map these. 
 Note: I have full faith that once Alonzo, Mataan, or Rahul perform this ritual a few times, they will rewrite the DTI core logic so this guide can be cast into the fires of Mount Doom (aka deleted). Until then, here we are.

 The Requirements

 1. Establish Comms: Ping your Services counterpart. You need to confirm exactly which column in the DTI is acting as the anchor for the historical identifier. Don't guess; "Measure twice, DROP TABLE once."

 2. Forge the Custom Field: Once confirmed, set up a new custom field in ATS. You can use the JSON payload below as your blueprint. 

(Update the Name and Label as needed to match the business requirements.)

 {
 "Finding Highlights": [
 {
 "LABEL": "Historical ID",
 "Type": "text",
 "Attributes": "readonly",
 " Name
": " historicalID
",
 "Filter": true,
 "skipScopeForSelect2": true,
 "extensionsData": true,
 "Required": false,
 "backEndValidation": false,
 "showOnCompactForm": false,
 "showOnCompactFormWithNewUI": false,
 "showOnConfirmation": true,
 "ShowOnForm": true
 }
 ]
}

 Pro Tip: If the business already has a custom field, simply append the attributes from the label to the end of their existing config in the main section of their form.

 3. Initiate the SQL Script: Locate the attached ats_DTI_setHistoricalID.sql. Read the comments within the file like they are the instructions for a nuclear reactor. It provides a step-by-step walkthrough of the execution.

 4. Ascend to Mastery: If the script executes and the data populates... CONGRATULATIONS! You have leveled up. You are now the "Domain Owner" of this process. This includes the high honor of maintaining the logic within: 
 library\cfc\apps\ats\dataupload_validation.cfc

 5. The "System Failure" Protocol: If the code crumbles and the console bleeds red, do not panic. You must seek the Ancient Ones for guidance. Reach out to... well, whoever is still online and hasn't set their teams status to "In a meeting (Forever)." If all else fails, pray to the gods of sourcebot or find the person whose name appears most in the git blame.

 Final Note: With great power comes great responsibility (and more DTI tickets). Use it wisely.
---

# ATS - Scheduled Emails Details (PDD Testing)
Content ID: 1352
URL: https://tools.benchmarkdigital.com/kb/#content/1352
Products: Action Tracking System
Type: Guides
Last Modified: 2023-06-23 14:47:26
Author: Edith Gomez
Tags: Basic,Best Practice,Contributor,Mandatory,Pending Assignment,Programming Language,Recommended
Org Tags: Product Development and Operations
INTRODUCTIONHow we already knows, email details is a coldfusion custom tag, if you don't know about that, please check the next link for more information, because is really important meet this custom tag for the next explanation.Sending Email Details - Custom Tag** Only PDD can use this way to test **APPLICATIONAction Tracking SystemLOCATIONpowersuite/test/ehs/audit/FILESThe first thing to know is that scheduled emails are all located within these files:update.cfmupdateauditemail.cfmupdateAuditVerify.cfmupdateOpenAudit.cfmupdateOutstandingAuditEmail.cfmupdateRPEmail.cfmHow test scheduled emails on ATS? 1.- We will open any business from stage that we need to work, open from Benchmark Portal.Benchmark PortalIn my case I will need "Envision" business:2.- Now, when we are in "My home", open ATS application and open it in new window.3.- If you open up update.cfm in code, this url is what youll need.update.cfm?SchedulerRunDate=10/26/2015&onscreen=yes&testing=true4.- So you'll replace the url like thisFrom this:To this:5.- The email that I need test shows this date which is why I changed date in url6.- We will see a LOT of emails in the browser now:
---

# ATS DB Extract Query
Content ID: 2467
URL: https://tools.benchmarkdigital.com/kb/#content/2467
Products: Action Tracking System
Type: Guides
Last Modified: 2024-10-11 09:40:28
Author: Mataan Abucar
Binder IDs: 360
This is a complete query to for full data extract of ATS data (This also contains sub-dept and site data points).Link to sub-corrective actions query (if needed)If the business has custom fields that need to be included please reach out to the ATS team for help adding that to the query.SELECT
 top 2500
 [ATS Findings].[Orgname] AS [Orgname],
 [ATS Findings].[Location] AS [Location],
 [ATS Findings].[ID] AS [ID],
 [ATS Findings].[AuditName] AS [AuditName],
 [ATS Findings].[AuditDate] AS [AuditDate],
 [ATS Findings].[AuditType] AS [AuditType],
 [ATS Findings].[FindingType] AS [FindingType],
 [ATS Findings].[Category] AS [Category],
 [ATS Findings].[Citation] AS [Citation],
 [ATS Findings].[NumItems] AS [NumItems],
 [ATS Findings].[RepeatItem] AS [RepeatItem],
 [ATS Findings].[Classification] AS [Classification],
 [ATS Findings].[COE] AS [COE],
 [ATS Findings].[Bldg] AS [Bldg],
 [ATS Findings].[Workstation] AS [Workstation],
 [ATS Findings].[ResponPerson] AS [ResponPerson],
 [ATS Findings].[Description] AS [Description],
 [ATS Findings].[CorrectiveAction] AS [CorrectiveAction],
 [ATS Findings].[ContactPerson] AS [ContactPerson],
 [ATS Findings].[ContactPhone] AS [ContactPhone],
 [ATS Findings].[CloseDate] AS [CloseDate],
 [ATS Findings].[CloseComment] AS [CloseComment],
 [ATS Findings].[ClosePerson] AS [ClosePerson],
 [ATS Findings].[Status] AS [Status],
 [ATS Findings].[ClosureDueDate] AS [ClosureDueDate],
 [ATS Findings].[Optional_1] AS [Optional_1],
 [ATS Findings].[Optional_2] AS [Optional_2],
 [ATS Findings].[Optional_5] AS [Optional_5],
 [ATS Findings].[RefType] AS [RefType],
 [ATS Findings].[RefID] AS [RefID],
 [ATS Findings].[UpdateDate] AS [UpdateDate],
 [ATS Findings].[UpdateUser] AS [UpdateUser],
 [ATS Findings].[UpdateHistory] AS [UpdateHistory],
 [ATS Findings].[HighPriority] AS [HighPriority],
 [ATS Findings].[VerifyPerson] AS [VerifyPerson],
 [ATS Findings].[VerifyDate] AS [VerifyDate],
 [ATS Findings].[VerifyComment] AS [VerifyComment],
 [ATS Findings].[DaysBeforeReminder] AS [DaysBeforeReminder],
 [ATS Findings].[VerifyByDate] AS [VerifyByDate],
 [ATS Findings].[SubCOEID] AS [SubCOEID],
 [ATS Findings].[MultiCC] AS [MultiCC],
 [ATS Findings].[InvestigationDetails] AS [InvestigationDetails],
 [ATS Findings].[CAPARequired] AS [CAPARequired],
 [ATS Findings].[MXWasChecked] AS [MXWasChecked],
 [ATS Findings].[MXHasDouble] AS [MXHasDouble],
 [ATS Findings].[MXWasUpdated] AS [MXWasUpdated],
 [ATS Findings].[MXEncode] AS [MXEncode],
 [ATS Findings].[tblAuditID] AS [tblAuditID],
 [ATS Findings].[Optional_6] AS [Optional_6],
 [ATS Findings].[Optional_7] AS [Optional_7],
 [ATS Findings].[Optional_8] AS [Optional_8],
 [ATS Findings].[ExternalSubmit] AS [ExternalSubmit],
 [ATS Findings].[Employee] AS [Employee],
 [ATS Findings].[coResponPerson] AS [coResponPerson],
 CASE
 WHEN [ATS Findings].status = 'Closed'
 and [ATS Findings].CloseDate <> '' THEN dateDiff(day, [ATS Findings].Auditdate, [ATS Findings].CloseDate)
 WHEN [ATS Findings].status <> 'Closed' THEN dateDiff(day, [ATS Findings].Auditdate, getdate())
 END AS DaysOpenToClose,
 CASE
 WHEN [ATS Findings].status = 'Closed'
 AND [ATS Findings].CloseDate <> '' THEN datediff(day, [ATS Findings].closureduedate, [ATS Findings].closeDate)
 ELSE datediff(day, [ATS Findings].closureDueDate, getdate())
 END AS DaysPastDue,
 CASE
 WHEN [ATS Findings].VerifyPerson IS NOT NULL
 AND [ATS Findings].VerifyDate IS NOT NULL THEN 'Complete'
 WHEN [ATS Findings].VerifyPerson IS NOT NULL
 AND [ATS Findings].VerifyDate IS NULL
 AND [ATS Findings].Status = N'Closed' THEN 'Pending'
 WHEN [ATS Findings].VerifyPerson IS NOT NULL
 AND [ATS Findings].VerifyDate IS NULL THEN 'Assigned'
 ELSE NULL
 END AS VerifyStatus,
 [ATS Findings].[Optional_3] AS [Root Cause],
 [ATS Findings].[Optional_4] AS [EffectivityDate],
 [ATS Findings].optional_1 + isNull([ATS Findings].optional_5, '') AS EffectivityColumn,
 ltbContact.SSOID as [RespPerson SSOID],
 [Sub Dept].[DeptID] AS [DeptID (ltbCOE_Sub)],
 [Sub Dept].[SubCOE] AS [SubCOE (ltbCOE_Sub)],
 [Sub Dept].[COE_Contact] AS [COE_Contact (ltbCOE_Sub)],
 [Sub Dept].[SubCOEID] AS [SubCOEID (ltbCOE_Sub)],
 [Sub Dept].[Archive] AS [Archive (ltbCOE_Sub)],
 [Sub Dept].[UpdateDate] AS [UpdateDate (ltbCOE_Sub)],
 [Sub Dept].[UpdateBy] AS [UpdateBy (ltbCOE_Sub)],
 [Sub Dept].[COE_Ops_Contact] AS [COE_Ops_Contact (ltbCOE_Sub)],
 --[Sub Dept].[SiteID] AS [SiteID],
 [Sub Dept].[SubCOEcountry] AS [SubCOEcountry (ltbCOE_Sub)],
 [Sub Dept].[SubCOEregion] AS [SubCOEregion (ltbCOE_Sub)],
 [Sub Dept].[MXWasChecked] AS [MXWasChecked (ltbCOE_Sub)],
 [Sub Dept].[MXHasDouble] AS [MXHasDouble (ltbCOE_Sub)],
 [Sub Dept].[MXWasUpdated] AS [MXWasUpdated (ltbCOE_Sub)],
 [Sub Dept].[MXEncode] AS [MXEncode (ltbCOE_Sub)],
 [Sub Dept].[Latitude] AS [Latitude (ltbCOE_Sub)],
 [Sub Dept].[Longitude] AS [Longitude (ltbCOE_Sub)],
 [Site Details].[ORGNAME] AS [ORGNAME1],
 [Site Details].[Location] AS [Location (Site)],
 [Site Details].[ADMIN] AS [ADMIN],
 [Site Details].[MANAGER] AS [MANAGER],
 [Site Details].[OPS_MANAGER] AS [OPS_MANAGER],
 [Site Details].[PASSWORD] AS [PASSWORD],
 [Site Details].[SUBORG] AS [SUBORG],
 [Site Details].[ATSCC_ON] AS [ATSCC_ON],
 [Site Details].[SITEDESC] AS [SITEDESC],
 [Site Details].[Archive] AS [Archive (Site)],
 [Site Details].[ProjCal] AS [ProjCal],
 [Site Details].[SubSite] AS [SubSite],
 [Site Details].[DefaultOrg] AS [DefaultOrg],
 [Site Details].[DefaultTypeGroup] AS [DefaultTypeGroup],
 [Site Details].[SiteRegion] AS [SiteRegion],
 [Site Details].[SiteCountry] AS [SiteCountry],
 [Site Details].[SiteTimeZone] AS [SiteTimeZone],
 [Site Details].[POWER_ON] AS [POWER_ON],
 [Site Details].[SiteID] AS [SiteID (Site)],
 [Site Details].[COMPLIANCE_MANAGER] AS [COMPLIANCE_MANAGER],
 [Site Details].[UpdateBy] AS [UpdateBy (Site)],
 [Site Details].[UpdateDate] AS [UpdateDate (Site)],
 CAST([Site Details].[UpdateHistory] as nvarchar(1024)) AS [UpdateHistory (Site)],
 [Site Details].[SubCOE] AS [SubCOE (Site)],
 [Site Details].[DateCreated] AS [DateCreated],
 [Site Details].[DateArchived] AS [DateArchived],
 [Site Details].[PowerSuite_ON] AS [PowerSuite_ON],
 [Site Details].[update_user] AS [update_user],
 [Site Details].[VirtualSite] AS [VirtualSite],
 [Site Details].[MXWasChecked] AS [MXWasChecked (Site)],
 [Site Details].[MXHasDouble] AS [MXHasDouble (Site)],
 [Site Details].[MXWasUpdated] AS [MXWasUpdated (Site)],
 [Site Details].[MXEncode] AS [MXEncode (Site)],
 [Site Details].[Cockpit] AS [Cockpit],
 [Site Details].[CompanyCockpit] AS [CompanyCockpit],
 [Site Details].[PIT_ON] AS [PIT_ON],
 [Site Details].[courseregion] AS [courseregion],
 [Site Details].[Latitude] AS [Latitude (Site)],
 [Site Details].[Longitude] AS [Longitude (Site)],
 [Site Details].[SiteAddress] AS [SiteAddress],
 [Site Details].[SiteState] AS [SiteState],
 [Site Details].[SiteZip] AS [SiteZip]
FROM
 [dbo].[TblAudit] [ATS Findings] with(nolock)
 LEFT JOIN [dbo].[ltbCOE_Sub] [Sub Dept] with(nolock) ON (
 [ATS Findings].[SubCOEID] = [Sub Dept].[SubCOEID]
 )
 LEFT OUTER JOIN ltbContact WITH (NOLOCK) ON [ATS Findings].ResponPerson = ltbContact.Contact_Name

 INNER JOIN [dbo].[Site] [Site Details] with(nolock) ON (
 (
 [ATS Findings].[Location] = [Site Details].[Location]
 )
 AND (
 [ATS Findings].[Orgname] = [Site Details].[ORGNAME]
 )
 )
where 1=1

ORDER BY
 [ATS Findings].[tblAuditID] DESC
---

# ATS Due date extension
Content ID: 1662
URL: https://tools.benchmarkdigital.com/kb/#content/1662
Products: Action Tracking System
Type: Guides
Last Modified: 2023-08-07 10:18:05
Author: Mataan Abucar
Binder IDs: 360
Feature Functionality DescriptionLockdown the closure due date/closure category fields, and require request to be sent ( for approval/rejection ). The request is sent to special right users for approval or rejection of the request. An email will be sent to the approver with a link to approve or reject the request as well as a follow up email to the requester noting the approval status.Minimum Project Services Cost$5000
PermissionsUsually a new special right is added "Closure Due Date Approver" but the approver/SR can be any existing or new special right.
Workflow DiagramSend request:Request Pending:Approver View:Approved or Rejected:
---

# ATS Permissions Model: Access Levels, Special Rights & Feature Unlocks
Content ID: 3584
URL: https://tools.benchmarkdigital.com/kb/#content/3584
Products: Action Tracking System
Type: Guides
Last Modified: 2026-06-23 08:40:45
Author: Rahul Jha
Tags: Action Tracking System
Org Tags: All Team
Overview
This article documents the complete permissions model for the Action Tracking System (ATS), based on source code analysis of audfinding.cfm, audit.cfm, status.cfm, topbar.cfm, and related files in the ATS repo. It covers standard access levels, Special Rights, and exactly what each unlocks across all ATS pages.

Standard Access Levels

 Level
 Who They Are
 What They Can Do in ATS

 Level 0
 No access / public user
 ❌ Cannot add or edit any action. Denied at the form via DenySignOn regardless of any Special Rights held.

 Level 1
 Responsible Person, Co-RP, Auditor/Contact, or Closure Verifier of a specific action
 ✅ Can add new actions. Can edit only actions where they are the RP, Co-RP, Contact Person, or Closure Verifier.

 Level 2
 Similar to Level 1 with slightly elevated scope
 ✅ Same edit rules as Level 1. Can bypass RP edit restriction if setup var byPassLevel2_RPEdit is enabled.

 Level 3
 Full site access
 ✅ Can add, edit, and delete any action at the site. Can edit locked fields (Action Type, Reference fields) without restrictions.

 ⚠️ Important: The Business Administrator Special Right does NOT override a Level 0 access level. The user must have at minimum Level 1 for BA to have any effect. Level 0 is a hard block regardless of Special Rights.

Homepage (audit.cfm) — What BA and Level Controls

 Feature
 Level 0 / Level 0 + BA
 Level 1
 Level 2+

 Access Homepage
 ✅ Yes
 ✅ Yes
 ✅ Yes

 "My" Site Status Row
 ✅ Visible
 ✅ Visible
 ✅ Visible

 "Site" Status Row
 ❌ Hidden
 ❌ Hidden
 ✅ Visible

 Granular Sub-report (Subsite/Dept/Building)
 ❌ Hidden
 ❌ Hidden
 ✅ Visible

 RP / Contact Filter Dropdowns
 Scoped to self only
 Scoped to self only
 All contacts

Note: BA Special Right has no effect on homepage display logic. All rows and filters are controlled strictly by AccessLevel. The only BA unlock on the homepage exists in audit_beta.cfm where the Edit button on action rows is shown for Level 3 OR BA.

Special Rights — Complete List

 Special Right
 What It Unlocks

 Business Administrator

 Full edit/delete on any action regardless of level
 Can change locked fields: Action Date, Action Type, Finding Type, Finding Category, Reference Type/ID
 Can override Close Date restrictions
 Required for editing Closure-Verified & Approved actions (lockActionFindingBasedOnPermissions)
 Shows the Delete Action button
 Can manage Sub-Category (combined with Finding Sub-Category Administrator check)
 Can change Closure Category when RiskCategory_EditClosureDueDate = true
 Bypasses restrictEditToCreatorOrBA lock
 Bypasses lockdownFields setup var field locks
 Bypasses ATS_FindingDetails_Block Description / Corrective Action read-only lock
 Unlocks Action Date flatpickr clear/quick-date shortcuts on Edit

 Closure Verifier (configurable via CAPA_SpecialRight)

 Can be assigned as the designated closure verification person
 Can approve or reject a closed action on the Status page
 Populated via getLtbContacstByRight. If no one holds this right, the system falls back to BA holders

 Closure Verifier Administrator

 Can change who the Closure Verifier is assigned to, even after it is already set
 Overrides the VerifyDisable = DISABLED lock

 Action Addition

 When hideAddAction setup var is enabled, only users with this right see the Add New Action link in the top navigation

 Finding Sub-Category Administrator

 Unlocks the Sub-Category menu item under the Manage menu in the top navigation bar

 restrictHotToSpecialRight (configurable)

 Restricts the Hot Upload / Batch Upload (XLS) feature to only holders of the configured Special Right

 closedDate_backDate_specialRight (configurable)

 Allows the holder to back-date the Close Date field
 Without this right, close date is locked to today's date when closeDate_validStartDate is configured

 verifierRoleAssignmentSpecialRight (configurable)

 Allows the holder to assign/change the Closure Verifier even when they would normally be blocked (e.g., Level 1 non-RP users)

Key Page-Level Access Rules

 Page / Action
 Access Rule

 Add New Action (audfinding.cfm — Add mode)
 Requires Level 1 minimum. If hideAddAction is on and user lacks Action Addition SR, add link is hidden.

 Edit Action (audfinding.cfm — Edit mode)
 Level 1 only if user is RP/Co-RP/Contact/Closure Verifier. Level 3 can edit any action. BA can edit any action including locked fields.

 Delete Action
 Only visible for Business Administrator SR holders. Sends deletion notification email to Site Lead and BA.

 Close / Status Change
 Status field is hidden (forced Open) for new actions, draft mode, certain auto-escalation states, and when lockFields includes "status".

 Closure Verification (Approve/Reject)
 Only the assigned Closure Verifier, BA, or Closure Verifier Administrator SR holders can approve/reject. Others see the field as DISABLED.

 Sub-Category Management
 Only shown in Manage menu if user has Finding Sub-Category Administrator SR.

 Data Mining / Reports
 Available to all users with site access. Custom Groups filter requires BA or SingleSignOn = No.

 Batch Edit HOT (Data Mining)
 Controlled by batchEditHOT_specialRightList setup var (defaults to Business Administrator).

 Drafts
 If isPermissTollgateRequiredForDraft is on, accessing a draft requires Level 3. Otherwise Level 1+ can manage their own drafts.

Sub-Corrective Action (Sub-CA) Permissions
Sub-CA Responsible Persons are added to the Low-Level Permission list automatically. This grants Level 1 access to anyone named as a Sub-CA RP on an action, giving them access to that specific action record even if they have no other permissions.

Fields Unlocked by Business Administrator

 Field / Feature
 Non-BA Behavior
 BA Behavior

 Action Date (AuditDate) — on Edit
 Read-only; AdminMessage() fires on focus
 Fully editable; flatpickr shortcuts restored

 Action Type — when ProtectTags = Yes
 Read-only
 Fully editable

 Finding Type — when ProtectTags = Yes
 Read-only
 Fully editable

 Finding Category — when ProtectTags = Yes
 Read-only
 Fully editable

 Reference Type & Reference ID
 Locked (read-only span) once set
 Editable

 Closure Due Date — when RiskCategory_EditClosureDueDate = true
 Static/auto-calculated only
 Switches to editable input

 Lockdown Fields (lockdownFields setup var)
 Disabled with red warning note
 Fully editable

 Description — when ATS_FindingDetails_Block = true
 Read-only text display
 Editable textarea

 Corrective Action — when ATS_FindingDetails_Block = true
 Read-only text display
 Editable textarea

 Delete Action button
 Not shown
 Visible and functional

 Closure Verification field (VerifyBy)
 DISABLED unless user is assigned verifier
 Always editable

 Custom Groups filter (Data Mining / Charts)
 Hidden when SingleSignOn = Yes
 Visible

 Batch Edit HOT (Data Mining)
 Hidden unless SR configured
 Visible (default configured SR)

This article was generated with AI assistance based on source code analysis. Content should be verified against the latest codebase for accuracy.
---

# ATS Sub-corrective actions DB Extract Query
Content ID: 2466
URL: https://tools.benchmarkdigital.com/kb/#content/2466
Products: Action Tracking System
Type: Guides
Last Modified: 2024-10-11 09:39:33
Author: Mataan Abucar
Tags: Action Tracking System,Database
Org Tags: All Team
This is a complete query to for full data extract of ATS Sub-corrective actions dataselect
 --top 100
 sub.*,
 s.org,
 x.suborgid,
 s.siteid
FROM
 TblAudit_Step sub with (nolock)
 inner join TblAudit a with (nolock) on a.id = sub.ID
 and a.Orgname = sub.Orgname
 and a.Location = sub.Location
 left join ltbCOE_Sub cs with (nolock) on cs.SubCOEID = a.SubCOEID
 inner join qryOrgSite s with (nolock) on sub.orgname = s.orgname
 and sub.location = s.location
 left join suborg x with (nolock) on s.orgname = x.orgname
 and s.suborg = x.suborg
where
 s.powersuite_on = 1
 and s.archive = 0
 and s.atscc_on = 1
---

# Audit Assistant DB Extract Query
Content ID: 2468
URL: https://tools.benchmarkdigital.com/kb/#content/2468
Products: Audit Assistant
Type: Guides
Last Modified: 2024-10-11 09:44:53
Author: Mataan Abucar
Tags: Audit Assistant,Database
Org Tags: All Team
Binder IDs: 360
This is a complete query to for full data extract of Audit Assistant dataSELECT
 top 1000 
 aa.AuditRoomName [Room Name],
 aa.AuditroomNumber,
 case
 when ars.AuditStatusName = 'active'
 and getdate() > aa.EndDate then 'Active (Expired)'
 else ars.AuditStatusName
 end AS [Audit Room Status],
 ati.AuditTypeName AS [Audit Type Name],
 aa.CreatedBy,
 aa.Org,
 aa.SubOrg,
 aa.site as location,
 aa.AuditPlannerID,
 roomcoe.COE as [room dept],
 roomsubcoe.SubCOE as [room sub-dept],
 STUFF(
 (
 SELECT
 ', ' + at1.ContactName
 FROM
 AA_AuditTeam at1 with (nolock)
 WHERE
 at1.AuditRoomID = at.AuditRoomID FOR XML PATH('')
 ),
 1,
 2,
 ''
 ) as [Audit Team],
 o.ObservationViewableID as ObservationID,
 o.Description,
 REPLACE(CONVERT(VARCHAR(11), o.createddate, 106), ' ', '-') as [Created Date],
 o.AssignedAuditor,
 f.FindingName,
 fc.category AS [Finding Category],
 REPLACE(CONVERT(VARCHAR(11), aa.StartDate, 106), ' ', '-') as [Start Date],
 REPLACE(CONVERT(VARCHAR(11), aa.EndDate, 106), ' ', '-') as [End Date],
 CASE
 WHEN o.repeatfinding = 1 THEN 'Yes'
 ELSE 'No'
 END AS repeatfinding,
 o.findingcorrectiveaction,
 o.ResponsiblePerson,
 o.RiskCategory AS RiskCategory,
 REPLACE(
 CONVERT(VARCHAR(11), o.findingclosuredate, 106),
 ' ',
 '-'
 ) as findingclosuredate,
 o.findingclosurecomment,
 c.closure as closurecategory,
 coe.coe as [observation dept],
 subcoe.subcoe [observation sub-dept],
 b.bldg,
 w.workstationname,
 os.observationstatusname,
 ot.observationtypename,
 o.citation,
 o.numitems,
 REPLACE(
 CONVERT(VARCHAR(11), o.observationdate, 106),
 ' ',
 '-'
 ) as observationdate,
 o.LockedByAssignedAuditor AS Locked,
 --qos.siteid AS attachmentSiteID
 aa.AuditRoomID as [room attachment ID],
 o.observationid as [observation attachment ID]
FROM
 aa_observations o WITH(NOLOCK)
 LEFT JOIN aa_auditroom aa WITH(NOLOCK) ON aa.auditRoomId = o.auditRoomId
 LEFT JOIN AA_AuditTeam at WITH(nolock) ON at.AuditRoomID = aa.AuditRoomID
 LEFT JOIN AA_ltbAuditStatus ars WITH(NOLOCK) ON aa.STATUS = ars.AuditStatusID
 LEFT JOIN AA_ltbAuditType ati WITH(NOLOCK) ON aa.AuditType = ati.AuditTypeID
 LEFT JOIN ltbclosure c WITH(NOLOCK) ON o.closurecategory = c.ltbclosureid
 LEFT JOIN ltbEnvPriority ep WITH(NOLOCK) ON o.RiskCategory = ep.EnvPriorityID
 LEFT JOIN ltbfindingtype f WITH(NOLOCK) ON o.findingtype = f.ltbfindingtypeid
 LEFT JOIN ltbcategory fc WITH(NOLOCK) ON o.findingcategory = fc.ltbcategoryid
 LEFT JOIN ltbbuilding b WITH(NOLOCK) ON o.bldgid = b.bldgid
 LEFT JOIN ltbworkstation w WITH(NOLOCK) ON o.workstationid = w.wkstid
 LEFT JOIN ltbcoe coe WITH(NOLOCK) ON o.coeid = coe.deptid
 LEFT JOIN ltbcoe roomcoe WITH(NOLOCK) ON aa.deptID = roomcoe.deptid
 LEFT JOIN ltbcoe_sub subcoe WITH(NOLOCK) ON o.subcoeid = subcoe.subcoeid
 LEFT JOIN ltbcoe_sub roomsubcoe WITH(NOLOCK) ON o.subcoeid = roomsubcoe.subcoeid
 LEFT JOIN aa_ltbobservationstatus os WITH(NOLOCK) ON o.observationstatus = os.observationstatusid
 LEFT JOIN aa_ltbobservationtype ot WITH(NOLOCK) ON o.observationtype = ot.observationtypeid 
 --where ars.AuditStatusName ='closed' and aa.EndDate < '2023-09-30'
GROUP BY
 ati.AuditTypeName,
 aa.AuditroomNumber,
 ars.AuditStatusName,
 o.observationid,
 at.AuditRoomID,
 aa.AuditRoomName,
 aa.CreatedBy,
 aa.Org,
 aa.SubOrg,
 roomcoe.COE,
 roomsubcoe.SubCOE,
 aa.AuditPlannerID,
 aa.site,
 o.description,
 o.createddate,
 o.assignedauditor,
 f.findingname,
 fc.category,
 aa.StartDate,
 aa.EndDate,
 o.repeatfinding,
 o.findingcorrectiveaction,
 o.responsibleperson,
 o.RiskCategory,
 o.findingclosuredate,
 o.findingclosurecomment,
 c.closure,
 coe.coe,
 b.bldg,
 w.workstationname,
 subcoe.subcoe,
 os.observationstatusname,
 ot.observationtypename,
 o.citation,
 o.numitems,
 o.observationdate,
 o.LockedByAssignedAuditor,
 aa.AuditRoomID,
 o.observationviewableid,
 ObservationID_IntID
order by
 aa.AuditroomNumber,
 o.ObservationViewableID
---

# Audit Assistant: Website Solution Advisor AI
Content ID: 3395
URL: https://tools.benchmarkdigital.com/kb/#content/3395
Products: Audit Assistant
Type: Program
Last Modified: 2026-05-07 23:12:20
Author: Lindsay Rickert
Tags: A.I.,Advanced,Automation
Org Tags: Platform Engineering and Operations
Binder IDs: 976
Audit Assistant

 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​​
 ​
 ​

 ​

 (link: https://benchmarkgensuite.com/app/audit-tracking-software/) 

 Audit Assistant Software ​

 Streamline
 audit data collection, report building, and virtual collaboration​

 Why
 Audit Assistant?

 Auditors
 who rely on manual techniques struggle to collaborate efficiently and ensure
 complete data and accuracy for compliance assurance.​

 · 
 Streamline Digital Collaboration

 o Create individual
 audit rooms for each audit in your plan, configure details, and attach
 reference resources for all audit team members to access, enabling efficient
 and centralized documentation.​

 · 
 At-A-Glance Transparency

 o View progress on
 a centralized dashboard, providing real-time visibility into the status of your
 audits and empowering informed decision-making.​

 · 
 Anytime, Anywhere Auditing

 o Update data and
 assign actions anytime, anywhere—across all devices—online or offline, ensuring
 seamless audit activities regardless of location or connectivity.​

 · 
 Engaged Team Collaboration

 o Collaborate with
 audit team members by entering, editing, and reviewing observation entries in
 real-time, fostering a unified and responsive approach to auditing.​

 · 
 Comprehensive Reporting and Action Tracking

 o Generate final
 audit reports to drive corrective actions to closure, enabling a structured and
 accountable process for addressing audit findings.​

 Features
 & Benefits​

 Streamline
 Audit Workflows and Empower Collaborative Reporting with Audit Software​

 · 
 Improve In-The-Field Audits​

 Enable auditors to quickly log audit findings and observations with or
 without internet connectivity and across any digital device for seamless data
 capture.​

 · 
 Effortless Audit Reporting

 Compile, review, and revise audit details, and easily data mine
 findings to trend for systematic problems, allowing you to generate
 comprehensive and insightful reports with minimal effort. ​

 · 
 Collaborative Audit Engagement​

 Establish a virtual audit room to collaborate with other auditors,
 consolidate observations, and assign responsibilities, for a unified and
 responsive approach to auditing.​

 ​
---

# Audit Assistant/Audit Planner - Internal FAQ
Content ID: 3339
URL: https://tools.benchmarkdigital.com/kb/#content/3339
Products: Audit Assistant
Type: Guides
Last Modified: 2026-05-05 02:05:17
Author: Vaishnavi Punnuri
Tags: Basic
Org Tags: Product Development and Operations,Strategic Relationship Management,Subscriber Delivery and Operations
1) To update the existing dropdown values under the “Audit Tools Planned/Used” field. (EX: rename “Baxter Global Procedure” to “Global Procedure.”)database - CoEHS_
Table - BLA_Tools-Execution Steps:Ex:• Begin by accessing the server : GSEUC1SQL01v
• Later access the Database : CoEHS_Vantive
• Run the select Query to take back-up of the table : Select * from BLA_Tools with(nolock)
• Take back-up of the table in Excel sheet
• Run the update query to rename the drop-down field : 
-Update BLA_Tools
SET Tool ='Global Procedures'
Where BLAToolsId=16 and Tool='Baxter Global Procedures'
and Archived=0
• Validate from the online page as well in the DB by running the select query.
---

# Audit Planner: Website Solution Advisor AI
Content ID: 3396
URL: https://tools.benchmarkdigital.com/kb/#content/3396
Products: Audit Assistant
Type: Program
Last Modified: 2026-05-07 23:13:20
Author: Lindsay Rickert
Tags: A.I.,Advanced,Automation
Org Tags: Platform Engineering and Operations
Binder IDs: 976
Audit Planner

 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​​
 ​
 ​

 ​

 (link: https://benchmarkgensuite.com/app/audit-management-software/) 

 Audit
 Planner Software 

 Build
 your business level audit program, including planning, staffing, and scheduling

 Why
 Audit Planner?

 Maintaining
 the health and condition of your company’s equipment and most important assets
 can only be done with an effective auditing plan.

 · 
 Create a Detailed Audit Plan

 o Coordinate a
 comprehensive audit plan across your organization, establishing a systematic
 approach to your auditing activities to avoid missed compliance mandates.​

 · 
 Pull from a Curated List of Experienced Auditors

 o Easily identify
 and manage a pool of qualified auditors with the right expertise for the job,
 saving time and ensuring you have the right team for each audit.​

 · 
 Quickly Allocate Resources

 o Efficiently
 allocate resources to align with your company’s evolving priorities , ensuring
 optimal utilization of your team and resources.​

 · 
 Develop Program Transparency

 o Maintain
 visibility and informed decision-making with a centralized platform for
 reviewing audit plans, auditor schedules, including historical data.​

 · 
 Build Transparency

 o Generate
 comprehensive reports on audit coverage by topic and/or region for transparency
 and accountability into your audit activities.​

 Features
 & Benefits​

 Increase
 the Transparency of Organizational-Wide Audit Schedules with Audit Management
 Software

 · 
 Easily Visualize Audit Schedules​

 Leverage a consolidated, digital audit management software system with
 an at-a-glance, easy-to-read audit schedule directly on your homepage.​

 · 
 Rely on Experienced Auditors​

 Upload qualification and experience documentation and track audit
 participation history to ensure you have the right team for each audit.

 · 
 Complete Audits and Follow-Up Actions​

 Seamlessly integrate with other Benchmark Gensuite applications to
 ensure effective and comprehensive regulatory compliance and audit management,
 from planning to follow-up.​

 ​
---

# Compliance Calendar DB Extract Query
Content ID: 2465
URL: https://tools.benchmarkdigital.com/kb/#content/2465
Products: Compliance Calendar
Type: Guides
Last Modified: 2024-10-11 09:26:31
Author: Mataan Abucar
Tags: Compliance Calendar,Database
Org Tags: All Team
Binder IDs: 360
This is a complete query to for full data extract of Calendar task/reminder dataSELECT TOP 25000 [Task Reminders].[ORGNAME] AS [ORGNAME],
 [Task Reminders].[LOCATION] AS [LOCATION],
 [Task Reminders].[TASK_NAME] AS [TASK_NAME],
 [Task Reminders].[REMINDER_DATE] AS [REMINDER_DATE],
 [Task Reminders].[RESP_PERSON] AS [RESP_PERSON],
 [Task Reminders].[COMPLETE] AS [COMPLETE],
 [Task Reminders].[COMPLETE_DATE] AS [COMPLETE_DATE],
 [Task Reminders].[COMMENT] AS [COMMENT],
 [Task Reminders].[EMAILSENT] AS [EMAILSENT],
 [Task Reminders].[EMAILWARN] AS [EMAILWARN],
 [Task Reminders].[EMAILLATE] AS [EMAILLATE],
 [Task Reminders].[REMINDER_PLAN] AS [REMINDER_PLAN],
 [Task Reminders].[MXWasChecked] AS [MXWasChecked],
 [Task Reminders].[MXHasDouble] AS [MXHasDouble],
 [Task Reminders].[MXWasUpdated] AS [MXWasUpdated],
 [Task Reminders].[MXEncode] AS [MXEncode],
 [Task Reminders].[TaskReminderID] AS [TaskReminderID],
 [Task Reminders].[VerifiedBy] AS [VerifiedBy],
 [Task Reminders].[Verified_Comment] AS [Verified_Comment],
 [Task Reminders].[Verified_Date] AS [Verified_Date],
 [Task Reminders].[Verified_Status] AS [Verified_Status],
 [Master Task Details].[ORGNAME] AS [ORGNAME (TASK)],
 [Master Task Details].[LOCATION] AS [LOCATION (TASK)],
 [Master Task Details].[TASK_NAME] AS [TASK_NAME (TASK)],
 [Master Task Details].[RESP_PERSON] AS [RESP_PERSON (TASK)],
 [Master Task Details].[RESP_CC] AS [RESP_CC],
 [Master Task Details].[MULT_CC] AS [MULT_CC],
 [Master Task Details].[MEDIA] AS [MEDIA],
 [Master Task Details].[COE] AS [COE],
 [Master Task Details].[REMIND] AS [REMIND],
 [Master Task Details].[FIRST_REM_DATE] AS [FIRST_REM_DATE],
 [Master Task Details].[REM_FREQ] AS [REM_FREQ],
 [Master Task Details].[REM_DAYS_PRIOR] AS [REM_DAYS_PRIOR],
 [Master Task Details].[LATEST_REM_DATE] AS [LATEST_REM_DATE],
 [Master Task Details].[REG_COMP] AS [REG_COMP],
 CAST([Master Task Details].[TASK_PLAN] as nvarchar(1024)) AS [TASK_PLAN],
 [Master Task Details].[WEBLINK] AS [WEBLINK],
 [Master Task Details].[TASK_PRIORITY] AS [TASK_PRIORITY],
 [Master Task Details].[INT_CONT] AS [INT_CONT],
 [Master Task Details].[TIM_EST] AS [TIM_EST],
 [Master Task Details].[COST_EST] AS [COST_EST],
 [Master Task Details].[COMP] AS [COMP],
 [Master Task Details].[COMP_DATE] AS [COMP_DATE],
 [Master Task Details].[CONSENT_ORDER] AS [CONSENT_ORDER],
 [Master Task Details].[CO_DATE] AS [CO_DATE],
 CAST([Master Task Details].[COMP_PLAN_DESC] as nvarchar(1024)) AS [COMP_PLAN_DESC],
 [Master Task Details].[COMP_REPT_FREQ] AS [COMP_REPT_FREQ],
 [Master Task Details].[COMP_REPT_FIRST_DATE] AS [COMP_REPT_FIRST_DATE],
 [Master Task Details].[PROJECT] AS [PROJECT],
 [Master Task Details].[UPDATE_DATE] AS [UPDATE_DATE],
 [Master Task Details].[RefType] AS [RefType],
 [Master Task Details].[RefID] AS [RefID],
 [Master Task Details].[UpdateUser] AS [UpdateUser],
 CAST([Master Task Details].[UpdateHistory] as nvarchar(1024)) AS [UpdateHistory],
 [Master Task Details].[MultiRemindDays] AS [MultiRemindDays],
 [Master Task Details].[LastMultiRemind] AS [LastMultiRemind],
 [Master Task Details].[MXWasChecked] AS [MXWasChecked (TASK)],
 [Master Task Details].[MXHasDouble] AS [MXHasDouble (TASK)],
 [Master Task Details].[MXWasUpdated] AS [MXWasUpdated (TASK)],
 [Master Task Details].[MXEncode] AS [MXEncode (TASK)],
 [Master Task Details].[WarnOnlyCC] AS [WarnOnlyCC],
 [Master Task Details].[TaskID] AS [TaskID],
 [Master Task Details].[SubTaskType] AS [SubTaskType],
 [Master Task Details].[Priority] AS [Priority],
 [Master Task Details].[ExternalSubmit] AS [ExternalSubmit],
 [Master Task Details].[NotifyCC] AS [NotifyCC],
 [Master Task Details].[LOCK_TASK] AS [LOCK_TASK],
 [Master Task Details].[SubCOEID] AS [SubCOEID],
 [Master Task Details].[LOCK_MAIL] AS [LOCK_MAIL],
 [Master Task Details].[Verifier] AS [Verifier],
 [Master Task Details].[Verify_Plan] AS [Verify_Plan],
 [Master Task Details].[ParentTaskId] AS [ParentTaskId],
 [Master Task Details].[DefaultSent] AS [DefaultSent],
 [Master Task Details].[DefaultWarn] AS [DefaultWarn],
 [Master Task Details].[DefaultLate] AS [DefaultLate],
 [Master Task Details].[Escalation_CC] AS [Escalation_CC],
 [Master Task Details].[Escalation_Mult_CC] AS [Escalation_Mult_CC],
 [Master Task Details].[BldgID] AS [BldgID],
 [Master Task Details].[WkstID] AS [WkstID],
 [Master Task Details].[isAttachmentRequired] AS [isAttachmentRequired],
 [Master Task Details].[TemplateID] AS [TemplateID],
 [Site Details].[ORGNAME] AS [ORGNAME (Site)],
 [Site Details].[Location] AS [Location1],
 [Site Details].[ADMIN] AS [ADMIN],
 [Site Details].[MANAGER] AS [MANAGER],
 [Site Details].[OPS_MANAGER] AS [OPS_MANAGER],
 [Site Details].[PASSWORD] AS [PASSWORD],
 [Site Details].[SUBORG] AS [SUBORG],
 [Site Details].[ATSCC_ON] AS [ATSCC_ON],
 [Site Details].[SITEDESC] AS [SITEDESC],
 [Site Details].[Archive] AS [Archive],
 [Site Details].[ProjCal] AS [ProjCal],
 [Site Details].[SubSite] AS [SubSite],
 [Site Details].[DefaultOrg] AS [DefaultOrg],
 [Site Details].[DefaultTypeGroup] AS [DefaultTypeGroup],
 [Site Details].[SiteRegion] AS [SiteRegion],
 [Site Details].[SiteCountry] AS [SiteCountry],
 [Site Details].[SiteTimeZone] AS [SiteTimeZone],
 [Site Details].[POWER_ON] AS [POWER_ON],
 [Site Details].[SiteID] AS [SiteID],
 [Site Details].[COMPLIANCE_MANAGER] AS [COMPLIANCE_MANAGER],
 [Site Details].[UpdateBy] AS [UpdateBy],
 [Site Details].[UpdateDate] AS [UpdateDate],
 CAST([Site Details].[UpdateHistory] as nvarchar(1024)) AS [UpdateHistory (Site)],
 [Site Details].[SubCOE] AS [SubCOE],
 [Site Details].[DateCreated] AS [DateCreated],
 [Site Details].[DateArchived] AS [DateArchived],
 [Site Details].[PowerSuite_ON] AS [PowerSuite_ON],
 [Site Details].[update_user] AS [update_user],
 [Site Details].[VirtualSite] AS [VirtualSite],
 [Site Details].[MXWasChecked] AS [MXWasChecked (Site)],
 [Site Details].[MXHasDouble] AS [MXHasDouble (Site)],
 [Site Details].[MXWasUpdated] AS [MXWasUpdated (Site)],
 [Site Details].[MXEncode] AS [MXEncode (Site)],
 [Site Details].[Cockpit] AS [Cockpit],
 [Site Details].[CompanyCockpit] AS [CompanyCockpit],
 [Site Details].[PIT_ON] AS [PIT_ON],
 [Site Details].[courseregion] AS [courseregion],
 [Site Details].[Latitude] AS [Latitude],
 [Site Details].[Longitude] AS [Longitude],
 [Site Details].[SiteAddress] AS [SiteAddress],
 [Site Details].[SiteState] AS [SiteState],
 [Site Details].[SiteZip] AS [SiteZip],
 TC.Citations,
 isarchived,
 case when ([Master Task Details].[FIRST_REM_DATE] = [Master Task Details].[COMP_DATE] and [Master Task Details].[COMP] = 1) then 1 else 0 end as [Disabled Task]

FROM [dbo].[TASK_REMINDER] [Task Reminders] with(nolock)
 INNER JOIN [dbo].[TASK] [Master Task Details] with(nolock) ON (([Task Reminders].[LOCATION] = [Master Task Details].[LOCATION]) AND ([Task Reminders].[ORGNAME] = [Master Task Details].[ORGNAME]) AND ([Task Reminders].[TASK_NAME] = [Master Task Details].[TASK_NAME]))
 RIGHT JOIN [dbo].[Site] [Site Details] with(nolock) ON (([Master Task Details].[ORGNAME] = [Site Details].[ORGNAME]) AND ([Master Task Details].[LOCATION] = [Site Details].[Location]))
 LEFT JOIN (SELECT taskid,stuff(
 (SELECT 
 ','+citation
 FROM TASK_CITATION tc WITH (NOLOCK)
 WHERE 
 tc.TaskID = t.taskID
 FOR XML PATH('')
 ),1,1,'') AS Citations
 from task t with(nolock)
 where taskid in (select taskid from TASK_Citation with(nolock))) tc on tc.TaskID=[Master Task Details].TaskID
WHERE Reminder_Date <= GetDate() + 90 and isarchived = 0 and [Site Details].archive = 0
ORDER BY REMINDER_DATE DESC
---

# Compliance Calendar Permissions Model: Access Levels, Special Rights & Feature Unlocks
Content ID: 3583
URL: https://tools.benchmarkdigital.com/kb/#content/3583
Products: Compliance Calendar
Type: Guides
Last Modified: 2026-06-23 08:39:36
Author: Rahul Jha
Tags: Compliance Calendar
Org Tags: All Team
Overview
This article documents the complete permissions model for Compliance Calendar, based on source code analysis of admtask.cfm, task.cfm, varDefinitions.cfm, and related files in the calendar repo. It covers standard access levels, Special Rights, and exactly what each unlocks across all Calendar pages.

Standard Access Levels

 Level
 Who They Are
 What They Can Do

 Level 0
 No site access / basic user
 Can view a task reminder page only if they are the RP, CC Person, Sub-Task Owner, or OOO Delegate. Cannot add or edit tasks. Cannot close a task unless the task is unlocked (LOCK_TASK=0) and user holds the Task Closer SR with Level 2.

 Level 1
 Responsible Person (RP) of the task
 Can add new tasks and edit tasks where they are the RP. Can view and close their own task reminders.

 Level 2
 Elevated site user
 Can view task reminders. Can close tasks that are unlocked (LOCK_TASK=0) — but only if they also hold the Task Closer Special Right.

 Level 3
 Full site access
 Can add, edit, view, and close any task. Can replicate tasks to multiple sites (only Level 3 sees the "Replicate for Multiple Sites" link). Can delete tasks unless the task is marked as Governance/Administrative.

The LOCK_TASK Field — Critical Permission Gate
When a task has "Limit Responsibility" checked (LOCK_TASK=1), only the following users can close it:

 The assigned Responsible Person (RP)
 The CC Person
 The OOO Delegate
 Site Lead, Manager, or Ops Manager
 Business Administrator Special Right holder
 External Submit user (if enabled and user is not the Closure Verifier)

Level 3 users who are NOT one of the above roles cannot close a locked task without the BA Special Right.

Special Rights — Complete List

 Special Right
 Page(s)
 What It Unlocks

 Business Administrator
 admtask.cfm, task.cfm

 ✅ Edit Business Priority field even when RestrictBusinessPriorityEdit = Yes
 ✅ Close any task regardless of LOCK_TASK setting or RP assignment
 ✅ Delete tasks — Delete button appears for Level 3 OR BA (when Level3Delete = true or TaskType IS NOT "")
 ✅ Verify or Reject Closure on the task view page
 ✅ AutoClose from email not blocked for BA
 ✅ Can edit tasks even when isTaskAdminSREnabled would block others
 ✅ Completion Comment admin links (edit/delete note) on the task view page

 Business Priority - Administrator
 admtask.cfm

 Can edit the Business Priority field — same unlock as BA for this specific field only
 Without this SR or BA, Business Priority checkbox is locked/read-only on Edit mode

 Task Closer
 task.cfm

 Allows Level 2 users to close unlocked tasks (LOCK_TASK=0)
 Without this SR, Level 2 users cannot close tasks even if the task is unlocked

 Task Administrator
 admtask.cfm

 When isTaskAdminSREnabled = true, required to access the Add/Edit Task page at all — users without it are shown a DenySignOn tollgate
 Can also edit Business Priority if allowTaskAdminToEditBusPri = true

 Key Task Editor
 admtask.cfm

 When KeyTaskEditor feature is enabled and this SR is configured, only holders of this SR (or the RP) can edit Regulatory or Business Priority tasks
 Non-holders who attempt to edit see a tollgate: "Access rights to edit this task are limited to those with the [SR Name] Special Right"

 Closure Verifier
 task.cfm, admtask.cfm

 The Closure Verifier section on the Add/Edit Task form only appears when at least one contact holds this SR
 On the task view page, users with this SR (or BA) can click Verify Closure and Reject Closure buttons
 Without it, those buttons are hidden

 Escalation Person Editor (escalationPersonEditor setup var)
 admtask.cfm

 Allows the holder to edit only the Escalation Person and Escalation Reminder Days fields on the Add/Edit Task form
 All other locked Business Priority fields remain locked for this user

Key Page-Level Access Rules

 Page / Action
 Access Rule

 Add/Edit Task (admtask.cfm)
 Requires Level 1 (if RP of the task) or Level 3 (any task). Level 0 is denied. If isTaskAdminSREnabled = true, Task Administrator SR is required for all users regardless of level.

 View Task Reminder (task.cfm)
 Requires Level 2+, OR being the RP / CC / Sub-Task Owner / OOO Delegate. Level 0 and 1 who are none of the above are denied.

 Close a Task Reminder
 RP (any level), CC Person (if allowCCcloseReminder = true), OOO Delegate, Site Lead, Manager, Ops Manager, BA, Level 3 + LOCK_TASK=0, or Level 2 + Task Closer SR + LOCK_TASK=0, or creator (if allowCreatedByToClose = true).

 Delete a Task
 Level 3 + Level3Delete = true, OR BA Special Right. For Governance/Administrative tasks, only the user with the administrativeRight_name SR can delete.

 Replicate Task to Multiple Sites
 Level 3 only — the "Replicate for Multiple Sites" link is shown only when AccessLevel EQ 3. BA does not substitute for Level 3 here.

 Edit Task (from Status/View page)
 Level 3, or Level 1/2 if the user is the RP, or when allowCreatedByToEdit = true and user is the task creator.

 Verify / Reject Closure
 Assigned Closure Verifier, BA, or Closure Verifier SR holder. The person who closed the task cannot also be the verifier.

 Due Date Extension Request
 Level 0+ can request an extension. Level 3 + BA, or the Due Date Extension Approver SR can auto-approve or approve/deny.

Administrative / Governance Tasks
When administrativeCheck = 1 on a task and the user lacks the administrativeRight_name SR:

 All fields on the Add/Edit form become read-only (adminHide = true)
 Sub-Tasks section is hidden
 The user cannot modify the task at all
 Only holders of the Governance SR can edit or delete these tasks

Additional Setup Var Controls

 Setup Variable
 Effect on Permissions

 allowCreatedByToClose
 When true, the original task creator can close task reminders regardless of their permission level

 allowCreatedByToEdit
 When true, the original task creator can edit tasks regardless of their permission level

 allowCCcloseReminder
 When true, the CC Person can close task reminders (in addition to the RP)

 minLevelToMakeOthersRP
 Sets the minimum access level required to assign someone other than yourself as the Responsible Person

 permissionsToUseMissedStatus
 Array of permission configs controlling who can use "Mark as Missed" status. If empty, all users who can close can also mark as missed

 autoEscalation_allowRPClosure / autoEscalation_allowSRClosure
 When a task is auto-escalated, controls who can close it. If these are off, only the escalation person may close the task

This article was generated with AI assistance based on source code analysis. Content should be verified against the latest codebase for accuracy.
---

# Compliance Calendar: Due Date Extension
Content ID: 1148
URL: https://tools.benchmarkdigital.com/kb/#content/1148
Products: Compliance Calendar
Type: Guides
Last Modified: 2022-02-10 16:45:29
Author: Anthony Cox
Tags: Advanced
Org Tags: Product Development and Operations,Strategic Relationship Management
Feature Functionality DescriptionEnables the users to extend the due date of Compliance Calendar Reminders as needed. Original Project funded by Nustar in Q4 2021. Base functionality allows users with level 0 permissions to request extention of the due date as long as the following criteria are met:Not a Once Only or Daily Task.Status is "Open".May not be extended on to or beyond the due date of the next occurance.May not be the last occurance in a series.When a request is added an email goes to the selected approver, CC the user that requested the due date extension and task RP if not the requestor. Any person with the ability to approve can approve/deny the request. An email goes back to the requestor notifying of the approval or denial, CC the actual approver, the selected approver, and the task RP if not already one of the other roles. If someone who is already able to approve the request starts the extension process, no approval is needed and no email is generated. Only one request can be pending at a time. The extension modal will show the status of the latest request as applicable. The request/extension history will also be in the task history section of the view task details page.
Configuration VariablesdueDateExtension_enabledueDateExtension_permissionModeldueDateExtension_labels

Solution Architecture
 calendar/beta/js/dueDateExtension/dueDateExtension.js (and .min)
 calendar/beta/js/dueDateExtension/reminderDueDateExtension.js (and .min)library/cfc/apps/calendar/dueDateExtension/dueDateExtension.cfclibrary/cfc/apps/calendar/dueDateExtension/reminderDueDateExtension.cfc
Permissions/Distribution ListsLevel 0 Permissions in Compliance Calendar for at least the site that's being accessed to request a due date extension.Level 3 + Bus Admin OR Due Date Extension Approver SR to Automatically extend due date or Approve/Deny due dates.Permission model could be changed via configuration variable.
FAQs - Common Issues, Troubleshooting, Maintenance
 Changing the First Task Date for Tasks which have extended Reminders may either duplicte or revert the due date extension. There is a warning alert that appears when changing the First Task Date that outlines this possibility when the functionality is enabled. 
Limitations/Dependencies on Related Extensions
 Special consideration may need to be taken if the business is also leveraging the holiday picker. Please reach out to PDD if the business in question wants to leverage both functionalities to determine if further development is needed.
---

# Compliance Calendar: Internal FAQ
Content ID: 1327
URL: https://tools.benchmarkdigital.com/kb/#content/1327
Products: Compliance Calendar
Type: Tips
Last Modified: 2026-06-23 08:48:36
Author: Anthony Cox
Tags: Best Practice,Contributor,Contributor,Contributor
Org Tags: Product Development and Operations,Subscriber Delivery and Operations
Binder IDs: 34|124|266|360
Welcome to the Calendar Internal FAQ Article! Here you will find very commonly asked questions about how Calendar works/integrations/complexities!​​Permissions Model: Access Levels, Special Rights and Feature Unlocks​﻿What are the lookup tables used in Calendar?﻿ltbCalendarMedia - Task Category (Supports Super Categories by way of the superMedia col in this table)frequency - Task Frequency ﻿Why does the Monthly (Day of Week) Frequency require an end date?﻿ Simply put this is not a "normal" frequency like the Weekly/Monthly/Annual/etc frequencies. There's a script that calulates what day of the week in the month (ex: 2nd Tuesday of the month) and then creates a series of once only tasks based on this, so it requires an end date since the replication only occurs at the time the task is created, and it does not populate out for 3+ rolling years like "normal" frequencies.Business is asking for data extracts, do we have any queries for it?We have the templates and queries added here for most apps. Doc Man link﻿Why can't I see tasks past 3 years in the future? Compliance Calendar by default only populates 3 years of reminders at a time into the future, rolling from the current day. This is maintained by the nightly task. If the problem is that the reminder record in question is 3+ years from now, this is not an issue. It would only be likely an issue if it is less than 3 years out and the reminder still has not populated. We have a configuration variable to set this timespan out longer but it should be used sparingly. The query that populates and maintains these records is rather resource intensive. I don't reccomend more than 5 years at a time.﻿Inactive or non users are CC'd on summary emails, why? or The email that's CC'd still has an old domain after a business updated user email domains in contacts DB, why? There are people who aren't on the Dlist for the summary emails but are still CC'd on the email?﻿ In these cases check the mult_cc column of the TASK table in the CC_#business# db. This field is saved by email address and can store external, non-user emails. These emails are not changed when contact record emails are changed. If there is a mismatch, that is likely the field it is coming from and can be fixed via the task edit form. When a task is on the site summary email as past due, then it will include the CC/Multi CC users regardless of if they are on the dlist for summary emails or not.Why can't I see the replicate to multiple sites link in the add/edit task page?﻿ You need to have level 3 permissions at other sites in order to see the link. This checks against permissions in the DB so Log Me In will not work.I see the task in the DB but no trace of it online, why? This is likely because the task is archived (isArchived=1 in the TASK table). This happens automatically when a department tagged to the task is also archived in the ltbCOE table through SMT. This could also be manually set by an internal team member directly in the Database but the most likely reason is the archived department.If you want to find who possibly archived the dept (assuming they did it via SMT) then check the Powersuiteweb_#company# db with this query: select * from gso_history with (nolock) where title like 'Dept%-Updated'If I unarchive the department, will it unarchive the task? Yes. Unarchiving the department will also unarchive the associated tasks. However, you should exercise caution to avoid unarchiving any unwanted tasks. When you unarchive the department, it will set the isArchived = 1 for all applicable tasks. In that case, you will need to manually remove the "_Archived-[TaskID]" sufix from the task_name column if you want to proceed with unarchiving the department.Can I unarchive the task even if the department is still archived? Yes, there's no issues with this. Set isArchived = 0 for all applicable tasks. Can a Task Closure/Reopen/Closure Verification/etc (User triggered emails) be sent adhoc? No, these emails are generated and sent at the time the action is performed, they can not be sent independently.The user is not getting task closure emails, why? There can be a whole host of reasons. Some things to check for is if the "Send Completion Email" checkbox is checked on the task closure email. If it is and they are still not getting emails, the suggested thing to do is add yourself to the CC/Multi CC of the task and have the user close the task. If you get the email with the user's valid email in the To: but they still do not recieve the email, then you will know that the problem is on their end and they must either review their outlook rules, or consult with their IT if the email is being blocked for whatever reason. The user is not able to deselect Send Completion Email checkbox while closing the task reminder, why? The Send completion email checkbox is checked and locked by default if other than RP is trying to close the task reminder, meaning email will go out mandatorily when closure performed by other than RP. We can configure it unlock/remove disabled checkbox for the business if need be.﻿The Emails from Adding/Editing a task is going to the Edit page, why?﻿ When you add/edit a task you are editing it at the "Parent" task level, not an individual occurance of the task. So by default emails sent from the add/edit user actions are going to be to that "Parent" task level. There is a configuration option to sent it to the view page without a specific occurance date. When this happens, calendar does the best guess as to the next upcoming task to fetch and return. ﻿My business wants more than 8 subtasks at a time, can they?﻿ Theorectically, yes. We have a config variable called "macNumSubtasks" that we can up if need be, and we can do this for "free". However, by doing this for free, we reserve the right to reduce the amount back to 8 if performance issues arise from upping the number of subtasks. The subtasks module is very resource intensive when creating/editing tasks so adding more subtasks at one time can significantly impact performace, especially for tasks that are very frequent (Every month or more frequent). ﻿How do I add a termination date to a task to stop it from reoccuring in the DB?﻿ First off: you can not add a termination date to a once only task! Inproperly setting the fields will cause weird things to happen to a once only task! This is only for Weekly/Monthly/Annual/etc tasks. Now, with that being said it's quite easy. You locate the task in the TASK table in the business's CC_ db, then you set the comp column = 1 and comp_date = to the date the business requested in yyyy-mm-dd format! Any OPEN tasks after that date will automatically be deleted from the TASK_REMINDER table, any open tasks before that date will not be touched. Any closed tasks before or after that date will also not be touched. If they want closed tasks after date to also be removed they will need to be removed directly from the TASK_REMINDER table. ﻿Oops I terminated the wrong task, how do I unterminate it? Almost just as easy as terminating! You will need to set in the TASK table comp = 0, comp_date = NULL, then you will need to set the latest_rem_date = to what the comp_date was set to. The reason for this is the query that populates reminders uses this as a shortcut to not waste resources checking dates for each task when generating the reminders. Setting it back to what the comp_date was before you NULLed it back out means the query when it runs the next night will check and re-create and task reminder after what the comp_date was, and should repopulate any reminder that setting the comp_date deleted!I do not see an option to terminate the task? You can not add a termination date to a once only task. If it is not a once only task then it may be below case If tasks are auto escalated then we restrict editing of many
fields, one being able to terminate the task.

 If this needs to be terminated, then can be done from backend.Will all the task reminders show up in the year view? Actually No, as the name says, the year view is a very compact view of reminders across the year. It shows first reminder of the particular date week. If user want to check multiple reminders within a week timeline, then they can use the other tab, MY, monthly,3 month view.﻿Why is my once only task creating a new occurance every time one is closed? There is a functionality called "repeat on task closure" that is standard and is available for once only tasks. This means when the once only task is closed, a new reminder X days/weeks/months/years from the date the task was "marked" as closed (NOT the date the closure action actually occured on) is automatically generated from that date. Does Compliance Calendar have REST API endpoints? Yes! We have GET, POST, and PUT to help manage parent task data (TASK table). There is currently no support for managing data at the individual task occurence layer through the API (TASK_REMINDER) or subtasks. ﻿How can I find Closure Verification information for a task in the DB?﻿ To find out what tasks have closure verification required, look in the TASK table. The Verifier column is who is assigned to verify the task closure, Verify_Plan is the instructions (not required). There is no verification due date. To see individual task occurance verification information use the TASK_REMINDER table. The VerifiedBy column is who actually verified the task, Verified_Comment and Verified Date is self explanitory, Verified_Status: 0 = pending (default for all records regardless if verification is needed), 1 = verified, -1 = rejected.A user will be OOO for an extended period of time, what can we do to reassign responsibilities? There's a few options... To address the user’s request and the solution that will work the best is the OOO delegator. This is setup by the GS Home team, but we have some options for it built out in calendar where the user can delegate a person to be able to close the tasks assigned to the person that will be OOO on their behalf. Sample reference code as below: 

 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​​
 ​
 ​

 ​https://sourcegraph.gensuite.com/code.gensuite.com/pm/library/cfc/-/blob/lookup/lookup.cfc#L1157:20

 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​​
 ​
 ​

 ​​ The next best is RP Replace, however this replaces all responsibilities across, at minimum, a particular app suite at a particular site. Up to globally across all suites and sites. This also comes with the issue of not being able to re-assign the responsibilities back easily as then the user's old responsibilities will be mixed it with the user they were delegated to existing responsibilities. The next option to be able to retain the user on the task but allow for someone else to close them is replace the resp_cc, the resp_cc can also close tasks like the resp_person. This comes with caution of overriding an existing CC. There can only be one Responsible CC, the Multiple CC does not give the same powers. The Final option is replacing them as the RP in the task and task_reminder table. (Maybe even subtasks if that’s used). This is the least recommended option, because once we reassign, we need to keep a list somewhere of which tasks were assigned away, so we know which tasks to assign back to her when she is back.﻿I see "duplicates" when changing the task date on a recurring task/the closed reminders aren't being updated.﻿ Closed reminders, by design, do not get updated when changing dates/RPs as a way to preserve the historical record of when the task was due and who the RP was when the task was closed. If you change the first task date of the reoccurance, it will start populating new reminders as needed instead of changing the task due date of any closed tasks within that period as needed. It's only a possible issue if open tasks are duplicated. ﻿How can I tell who deleted a task? UPDATED 3/20/2023 If the task was deleted after 3/20/2023 please read on, else, skip to "Deleted before 3/20/2023" Go to the TASK table, look up the task using a wildcard search. Deleted tasks have "_Archived-#taskID#" appended to the end. For example: select * from task with (nolock) where task_name like 'My Test Task Name%'. From here, you can use the update_history column to look at the end of the history and the stamp on who deleted the task in question. Done! Deleted before 3/20/2023: First off, deleted tasks move to the TASK_DELETED table, and like wise deleted CLOSED (not open) reminder records move to the TASK_REMINDER_DELETED table. To find who deleted these, depending on how recently they were deleted, you possibly have a few options. First check TASK_DELETED, the Deleted_Date table, if it's before Feb 11th, 2022 then we may not have the information saved. Next look at Deleted_by, if the data is something like GENSUITE\700000XXX, this means a benchmark team member directly logged into the DB and deleted the task, the number is thier SSO. Find this person and quiz them about the deletion. If it's something else, a text string instead of an SSO ID, this is the Cold Fusion Database Login, and is not useful other than knowing it was deleted by Cold Fusion, likely through a user manually deleting the task through the app. If the deleted_by date is after Feb 11th 2022, then go to the update_history column, the person who deleted the task will be recorded at the very end of the string like this pattern: "#date deleted#|#user name#|Deleted" you can then use this to report back to the business on who deleted the task. If the task was deleted before Feb 11th, 2022, you have one hope and that is attachments. Please use the query below to try to find possible attachments that were archived and by who at the time the task was deleted, if there are no hits then I'm sorry but we did not record that history prior to this date so we DO NOT have any additional information to help find who deleted the task. select 

 td.orgname

 ,td.location

 ,td.task_name

 ,td.update_date

 ,td.updateUser

 ,td.updateHistory

 ,td.deleted_date

 ,td.deleted_By

 ,sa.CAPTION as attachment_caption

 ,sa.id as attachment_refID

 ,sa.update_date as attachment_updateDate

 ,sa.UpdateBy as attachment_updateBy

 ,sa.archive as attachment_archive

 ,sa.archivedate as
attachment_archiveDate

 ,sa.archivereason as
attachment_archiveReason

from task_deleted td with (nolock) 

left join SiteAttach sa with (nolock)

 on sa.PARENT_TYPE = 'task'

 and sa.id = td.task_name

where td.taskID
=How do I restore a deleted task? UPDATED 3/20/2023 If the task was deleted after 3/20/2023 please read on, else, skip to "Deleted before 3/20/2023" Go to the TASK table, look up the task using a wildcard search. Deleted tasks have "_Archived-#taskID#" appended to the end. For example: select * from task with (nolock) where task_name like 'My Test Task Name%'. From here, you can simply run an update query to set isArchived = 0 and remove the "_Archived-#taskID#" from the end of the task name. However, you will also want to work with the attachments team to recover any attachments that were deleted with the task. Deleted before 3/20/2023: The process, to do it correctly in the most basic form, involves a few steps: Copy the data over from TASK_DELETED to the TASK table. Note the old taskID can not be copied over and will be changed because of the auto incrementing IDCopy over any deleted completed task reminder data from TASK_REMINDER_DELETED to TASK_REMINDER. Same as above, the old taskReminderID can not be copied over. You will need to update the taskDetailsID in these rows to reflect the new taskID from step 1. Update the latest_rem_date in the TASK table for the recovered record to NULL. This is needed so the open/open past due reminders regenerate automatically. Note: When you reset the latest_rem_date
and the scheduled task repopulates the open reminders on a recovered task, it
should populate all missing open reminders, so even old ones, yes. If you want
it to not go back past a certain date the latest_rem_date should be set to say,
today's date, then it will only populate open reminders after today.Assuming the business's nightly calendar scheduled task is set up and running, the missing open and open past due reminders should appear by the next day after the nightly task re-populates the data. How can we bulk archive the tasks﻿ We can use the following template as query for reference, but always complete the RA and get PDD approvals for the exact query which will be executed

 UPDATE task set isArchived = 1, task_name = CONCAT(LEFT(task_name, 245 - 10 - LEN(taskID)), '_Archived-', taskID)

 where TASK_NAME in ('Test Task Name')and orgName = 'Demonstration' and location = 'Demonstration'I see different RPs on the Homepage that I didn't filter by!﻿ Calendar Homepage RP filter pulls tasks back where the person selected is the RP, CC (not multi CC), or an RP of any 1 Subtask related to that task. I do not see Closure Verifier section shown on the add task page﻿ The Closure Verifier section shows up when we have at least one contact record with Closure Verifier Special Right present in DB. LMI will not work in this case if there is not a single contact record present with this Special﻿The homepage count at the bottom of the filters doesn't match the number of tasks on the output. It's not supposed to match. This count is pulled from "all time" there's no set time range. It's saying over all time there are X Tasks (YY Reminders) that match this criteria at this site. What you're viewing is a certain timespan snapshot of this. Those X tasks are spanned across Months and Years of data. ﻿When does the Add Action Button appear to add an action based on a Calendar Task?﻿ The default, assuming ATS is turned on for the business and site, is when the task is closed, as a "follow up" item. We have a configuration option available that would allow the button to always be shown. Takes only about one hour of PDD effort to get it set between stage and prod. ﻿My once only task is appearing every day on the homepage, what's up with that? If the once only task is appearing every day for a span of time and you see a > to the right of each task cell, that's a multiday once only task. That occurs when you give a once only task an end date. If the user did not mean for this then they, or you, must edit the task and remove the end date, and set the task date to what the end date originally was. This should make the once only task only appear once on the day it's due.﻿Who can close a Compliance Calendar task? Generally speaking, if the task is "Locked" (meaning closure is restricted, check the edit task form under the RP field) then only the RP,CC Person, or a user with Level 3 AND Bus Admin SR can close the task. If the task is "unlocked" this means the RP, CC, Any Level 3 user, or Level 2 + "Task Closer" Special right can close the task. Note EDITING is not the same as CLOSING. Level 3 can EDIT all tasks, they can not always CLOSE all tasks.Does Compliance Calendar have a HOT sheet option like ATS. It does! It's turned on by default for all stage instances. However exploratory testing needs to be done first before turning on for prod. Any custom fields, workflows, etc may need to be costed to the business to build into the HOT before we can turn it on for that instance. How does the Compliance Calendar (and similarly, ATS) Auto Escalation work? The Auto Escalation functionality uses the HR Feed (v_worker) to find the Task RP's Supervisor based on whatever sync fields the business is using (email, sso, altempid) and geHRSupervisorID. It finds the RP's v_worker record, looks at the geHRSupervisorID, then trys to find a match in v_worker on the sync field based on that ID. Get's that supervisor's information, checks/creates as needed a contact record for that supervisor in ltbcontact, and then "escalates" the record to the supervisor. If there is any missing information based on this workflow, it defaults to escalating to the site lead based on what's in the site table. For it to properly work, the RP and supervisor information must be complete in v_worker. Manually added contacts or contacts that do not have matching records in v_worker will result in ONLY being escalated to the site lead. Users are not receiving reminder/warning/late/escalation/summary emails. (Scheduled Task Info). The usual reason for this is the Scheduled Tasks are not set up. Please review STM for the applicable region (China, IAD, USE, GE, EU, etc) of the business to check if the Scheduled Task(s) are set up. Here is a run down of the scheduled tasks that are the most common:"Compliance Calendar" Daily Depreciated - This is the old style all-in-one Daily task, It handles all emails coming from update.cfm, and determines if summary emails need to go out based on what day it is and how the business is set up. Do not set new businesses to use this. "Compliance Calendar (updatecalrem)" Daily - This is the new daily task that should be set up for all businesses unless they explicitly request to have it off, if they have it off, see the (updatequery) task below. The two primary jobs it performs is 1) Sending Reminder/Warning/Late/Escalation (Non Auto Escalation) Emails and creating new reminders 3 years out from the current date. This second part is especially important for keeping calendar running on schedule. "Compliance Calendar (updatecalemail)" Monthly/Weekly - This is the Summary Email task. Default new businesses is Monthly and it MUST be set as the 14th of each month. We can configure it to run either weekly, any day of the week, or Monthly any day from the 1st-28th of the month, but it requires both configurations to be updated by PDD and the Scheduled task to be updated in STM. If they do not match, the emails will likely not go out as expected."Compliance Calendar (updatequery)" Daily - This task is optional as the (updatecalrem) usually does everything this task does already, but this task can come in handy for 2 senarios: 1) Business does not want emails sent so (updatecalrem) is turned off or 2) It is an especially large business that (updatecalrem) times out, splitting the task into 2 jobs can help reduce the load. "Compliance Calendar (updateautoescemail)" Daily - This task is for the Auto Escalation functionality (v_worker supervisor lookup) and must be enabled for Auto Escalation to work correctly. Not needed if the business does not have auto escalation enabled."Calendar Replication Email #X#" Daily - This sends out task added from replication emails, if this delayed sending is turned on. "Compliance Calendar Business Component #frequency# Task" Varies - This is a scheduled task that is designed to run business custom scheduled tasks created from business components. Allows for custom one off, non resellable tasks without mucking up the waters with 100 different task names.﻿How does the "My" Tab work in the Comp Cal Homepage Regardless of your other filters the "My" tab shows YOUR (logged in user) tasks and tasks with subtasks tied to you that are open from 1/1/1900 to Today's Date + 1 Month. Can calendar tasks be copied/moved from site to site? Copied - Yes. Use the "Replicate to multiple sites" feature to copy tasks from site to site. Moved - sort of. Use the same as copy, but then delete original task. Note: This does not move or copy historical data, it's a new, clean, independent task from the original. If original data needs to be copied or moved too, then it becomes either a back end activity or a reorg depending on the scope of what needs to move. At minimum things like Attachments, Departments, Workstations, and Buildings between site to site have to be considered to know what other background leg work needs to happen before the tasks themselves can be moved or copied with historical data. What is the difference between CC/Multi CC?CC is a single choice, Multi CC... is, well, MultipleCC is required to be a valid contact in the contact DB (ltbcontact by name as it's saved in the TASK table by name). Multi CC is stored by a list of emails, so the emails can be linked to registered users, or external. CC sometimes gives close to RP powers on the task (closing a task, viewing a task, etc) however, Multi CC is for only informational purposes, it does not grant any extra permissions.﻿The RP is different between TASK and TASK_REMINDER for the same task. ﻿ This is correct and expected when changing the RP of an already existing recurring task. When changing the RP, the RP of the TASK_REMINDER records that have already been closed will remain the old RP, who was the RP of the task when the task was closed. Maintained for Historical Auditing/Accountability.﻿How to rename the calendar app as per business requirement. ﻿ The IT team can do it by setting the setup_businessApp table displayAppName = 'NewAppName'. The permissions model needs to be updated as well to reflect the new name. We have an MSP job by which we can get the ltbAppPermissions rows updated.﻿How to decipher task history in the Database﻿ Most task history is stored in the TASK table UpdateHistory column. It is a pipe delimited list that follows sets of 3 in the following format: #updateDate#|#updateUser#|#updateAction# The update date and update user is pretty self explanitory, it's the actual date and user that performed the action, not a date they set themselves. The update actions only capture general actions done, you will likely see one of the following strings:Create - When the task was first createdCreateReminder, #reminder_date# - The action performed resulted in a new task 'reminder' (occurance) being created, the #reminder_date# is directly connected to the reminder_date column in the TASK_REMINDER table and is the due date for that reminder. That will tell you when that reminder was created. Note: Automated reminders do not record this history when they are generated from the scheduled task. Only when the user performs an action that has a direct result of creating reminders within the same page request.CloseReminder, #reminder_date# - Similar to above, this is the actual timestamp of when that occurance was closed and the #reminder_date# of the reminder that was closed. This is NOT the date that the user selects to say when they closed the task in the close task modal. That is saved in the TASK_REMINDER table, COMPLETE_DATE column, not the update history. Re-OpenReminder, #reminder_date# - Similar to above, but marks when the occurance was reopened.Close - This is NOT to be confused with CloseReminder. Close means the task was marked as terminated on this date, by the recorded user. Like above, the date recorded is NOT the termination date, just when the action was performed. The termination date is stored in the COMP_DATE column in the TASK table.ReminderMoved ... , #reminder_date# - This is not a common one, but is used for the holiday calendar extension/weekend as holiday feature. This states that a reminder was moved because it conflicted with a holiday or a weekend. the reminder_date is the NEW reminder date of the occurance, not the original one. The original one is mentioned in the history string.Edit - Just means a general task level edit was made. No before/After data is saved.Reminder Date Change, #reminder_date# - If a once only task and the task date was changed. EditReminder:Resp_Person,#reminder_date# - When changing an RP, if there are any open reminders that also had the RP changed, it records a history record for each reminder. There may be more action types out there but these are the most common you will run into. Extended History: In the record_history table (cc_odbc) there may be some extended history for tasks/task reminders based on implementation. Currently the only known support is for the due date approval workflow history. This can be found by searching for appID = 4, refType = taskReminderID, refID=#taskReminderID#. History stored here is JSON and much easier to decipher and understand. I'll let you do your own investigation :) ﻿How to enable Calendar without activate ATS for multiple sitesThere's a setup var configuration called splitAppActivationATSCC. By enabling it, the applications will appear as separate apps in SMT, allowing you to activate them indepentently for the site where needed.How to remove emails addresses from the Multiple Email CC(Multi CC) column in task table?** If only Comma **UPDATE T​SET mult_cc = Stuff((SELECT ',' + Ltrim(Rtrim(value))​ FROM String_split(T.mult_cc, ',')​ WHERE Ltrim(Rtrim(value)) NOT IN (​ 'John.Doe34172@noemail.gensuitellc.com',​ 'PH6@gensuitellc.com' )​ FOR xml path(''), type).value('.', 'NVARCHAR(MAX)'), 1,​ 1, '')​FROM task T​WHERE T.mult_cc LIKE '%John.Doe34172@noemail.gensuitellc.com%'​ OR T.mult_cc LIKE '%PH6@gensuitellc.com%' ** If only Semi-colon **​UPDATE T​SET mult_cc = Stuff((SELECT '; ' + Ltrim( Rtrim(value) )​ FROM String_split(T.mult_cc, ';')​ WHERE Ltrim(Rtrim(value)) NOT IN (​ 'John.Doe34172@noemail.gensuitellc.com',​ 'PH6@gensuitellc.com' )​ FOR xml path(''), type).value('.', 'NVARCHAR(MAX)'), 1,​ 2, '')​FROM [dbo].[task] T​WHERE ( T.mult_cc LIKE '%John.Doe34172@noemail.gensuitellc.com%'​ OR T.mult_cc LIKE '%PH6@gensuitellc.com%' ); ** If both **​UPDATE T​SET mult_cc = Isnull(CASE​ WHEN T.mult_cc LIKE '%,%'​ AND T.mult_cc NOT LIKE '%;%' THEN​ Stuff((SELECT ',' + Ltrim(Rtrim(value))​ FROM String_split(T.mult_cc,​ ',')​ WHERE Ltrim(Rtrim(value)) NOT​ IN (​ 'John.Doe34172@noemail.gensuitellc.com',​ 'PH6@gensuitellc.com' )​ FOR xml path(''), type).value('.',​ 'NVARCHAR(MAX)'), 1​ , 1, '')​ ELSE Stuff((SELECT '; ' + Ltrim(Rtrim(value))​ FROM String_split(T.mult_cc, ';')​ WHERE Ltrim(Rtrim(value)) NOT IN (​ 'John.Doe34172@noemail.gensuitellc.com',​ 'PH6@gensuitellc.com' )​ FOR xml path(''), type).value('.',​ 'NVARCHAR(MAX)'), 1, 1,​ '')​ END, '')​FROM [dbo].[task] T​WHERE ( T.mult_cc LIKE '%John.Doe34172@noemail.gensuitellc.com%'​ OR T.mult_cc LIKE '%PH6@gensuitellc.com%' ); ​﻿What are the logic and query for different Closure Verification status filter we see on data mining/homepage report?​NameHelp text (from report.cfm / product copy)SQL logic (added in qGetReportTasks in calendar.cfc)All(no extra label; means no filter)(none — closureVerification is empty, so the closure block is skipped)RequiredAll tasks that have Closure Verification specified.AND task.verifier IS NOT NULLAssignedOpen tasks that will require Closure Verification once closed.AND task_reminder.complete = 0 AND task.verifier IS NOT NULLPendingClosed tasks that require Closure Verification and have not been verified.AND task_reminder.complete = 1 AND (task_reminder.verified_status = 0 OR task_reminder.verified_status = -1) AND task.verifier IS NOT NULLCompleteClosed tasks where Closure Verification has been completed.AND task_reminder.complete = 1 AND task_reminder.verified_status = 1Not RequiredAll tasks that do not have Closure Verification specified.AND task.verifier IS NULL​​Custom field is not visible in batch upload excel?In calendar the custom fields are setup based on where we are looking to add the field using following variable. calAdditionalFields - For Showing the field on the master task(add/edit page)calRemAdditionalFields - For Showing the field on task view pageEven after adding the field in calAdditionalFields setup var if the field is not shown in excel upload. Then we need to add the variable in bus-app setup file as well.GSUSE1STAGE19v\PreProdcompany\Preprod\ehs\calendar\setup.cfm!---Putting this here until BATCH UPLOAD can figure out how to read the DB properly for the variable...---><cfset variables.additionalFields = {"Task Overview":[{"LABEL":"Focus Area","TYPE":"SELECT","DATA":{"1":"EHS","2":"Legal","3":"Quality"},"NAME":"focus_area","REQUIRED":true,"FILTER":"true","extensionsData":"true","attributes":"id=focus_area class=focus_area","showOnHomepage":"true","insights":"true","statusReport_completionBreakdown":"true"}]}/>
---

# Compliance Calendar: Website Solution Advisor AI
Content ID: 3397
URL: https://tools.benchmarkdigital.com/kb/#content/3397
Products: Compliance Calendar
Type: Program
Last Modified: 2026-05-07 23:14:38
Author: Lindsay Rickert
Tags: A.I.,Advanced,Automation
Org Tags: Platform Engineering and Operations
Binder IDs: 976
Compliance Calendar

 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​
 ​​
 ​
 ​

 ​

 (link: https://benchmarkgensuite.com/app/compliance-calendar/) 

 EHS
 Compliance Management Software

 Simplify
 on-going task and regulatory compliance obligation management

 Why Compliance
 Calendar?

 Even the most
 organized compliance leaders can struggle to manage the complexities of
 regulatory compliance-but they don't have to.

 Intelligent Integrations

 o 
 Seamlessly
 connect with Microsoft Outlook and other Benchmark Gensuite solutions to
 incorporate compliance actions into daily routines.

 Performance Reporting Insights

 o 
 View
 performance and completion status via powerful charting and reporting
 capabilities.

 Compliance Assurance

 o 
 Standardize
 compliance management and maintain an institutional memory of regulatory task
 completion.

 · 
 Automatic
 Reminders

 o 
 Schedule
 unique and reoccurring tasks with ease—from upcoming inspections to routine
 maintenance.

 · 
 Complete
 Program Visibility

 o 
 Connect
 with the entire EHS, Sustainability, Quality, and Compliance & Enterprise
 Risk suites for end-to-end management of ongoing regulatory compliance tasks
 and risk management.

 Features
 & Benefits​

 Keep
 EHS Teams Engaged and on Schedule with Automated Obligation Management

 Create
 a stable and secure regulatory compliance program with an EHS compliance
 calendar software.

 · 
 Automate Reminders

 o Rely on
 auto-generated email notifications for task deadlines, past-due notices, and
 completion confirmations.

 · 
 Communicate Deadlines with Ease

 o Integrate with
 Microsoft Outlook to boost engagement by sending reminders that fit your teams’
 daily routines.

 · 
 Improve Efficiency & Effectiveness

 o Assign and manage
 calendar tasks to track organizational obligations and task status—reducing
 compliance risks!

 ​
---

# Compliance Calendar: Why Certain Inspection Entries Do Not Open
Content ID: 3314
URL: https://tools.benchmarkdigital.com/kb/#content/3314
Products: Compliance Calendar
Type: Guides
Last Modified: 2026-04-13 07:25:22
Author: Vaishnavi Punnuri
Tags: Compliance Calendar
Org Tags: Product Development and Operations,Strategic Relationship Management
​
 ​
 ​
 ​
 ​
 ​
 ​
 ​​
 ​
 ​

 ​Some
 inspection entries on the Compliance Calendar open when we click on them and
 others do not, even though they look the same on the screen.

 What is going on:The calendar actually shows two kinds of inspection entries:

 Inspections that already
 exist in the system for that date
 For these, the application has a full record it can open. When you click
 the row, it takes you to that inspection.
 Upcoming dates that are only
 “scheduled ahead” on the calendar
 these are shown for visibility based on the schedule, but the actual
 inspection record has not yet been created, so there is nothing to open. The
 screen looks almost the same for both, but only the first type can be
 clicked through to open details. The second type appears on the
 calendar for planning visibility, but the “open inspection” action is not
 available until that inspection record exists.

 Is this a mistake in the code?
 It is not a random bug but Intentional. The behavior matches how
 the feature was built: if there is no inspection record to open, the row is
 shown without a link. We understand that from a user’s point of view it
 can feel broken, because there is no clear message explaining why one row
 works and another does not.Variable used to activate it?outputview - In Compliance Calendar, this variable will enable the PIT integration that will allow for users to see their pit assignment (or ATS Actions based on config) as 'tasks' on the Compliance Calendar homepage.

 ​
---

# Exclude  Technical Support Hours - Action Item Search Page
Content ID: 1357
URL: https://tools.benchmarkdigital.com/kb/#content/1357
Products: Action Tracking System
Type: Guides
Last Modified: 2022-07-13 11:21:32
Author: Tim Krajewski
Tags: Pending Assignment by Org
Org Tags: All Team
All
… We wanted to share a recent enhancement release to the Action Item Search (hyperlinked)
allowing us to exclude or edit technical support hours from HelpMe.What’s New?
 NEW ‘Exclude TSH’ and ‘Edit TSH’ Icon 

 In circumstances where a customer’s HelpMe needs to be
 modified to either Exclude or Edit support hours, the team has released
 NEW fields in the AI Search Page allowing updates without submitting a
 BPT request

 Exclude TSH … Pop
 up window confirming to exclude TSH hours for the particular HM +
 tollgate providing comment before submitting
 Edit TSH … Selection
 sends the user to the Manage
 Technical Support Service Hours (hyperlinked) with the ID
 details prepopulateExclude Technical Support Hours ... Confirm you want to exclude TSH for ID - Enter Exclusion Comment - SubmitEdit Technical Support Hours ... Editing TSH will take you to the 'Manage Technical Support Services Hours'
---

# Frequently Asked Questions - Compliance Calendar
Content ID: 926
URL: https://tools.benchmarkdigital.com/kb/#content/926
Products: Compliance Calendar
Type: Guides
Last Modified: 2026-05-05 01:18:44
Author: Kade Medd
Tags: Contributor,Contributor,Support
Org Tags: Global Subscriber Development,Strategic Relationship Management
13) Is it possible to enable only Compliance Calendar without activate ATS for different sites ?Below are answers to questions that often come up when demoing or deploying Compliance Calendar. These questions, together with the App Dossier and Implementation Playbook planning questions, provide a comprehensive overview of the Compliance Calendar.1) Can I assign a task to multiple people?A task must be assigned to a primary
responsible person, but you have the ability to CC multiple people on task so
that everyone can stay notified. Additionally, you also have the ability to create
and assign sub-tasks to different users as another avenue to involve multiple
people in the execution of a task. 2) Can I specify the frequency that emails are
sent? Yes, you have the ability to define when
the first email reminder will be sent as well as additional reminders. For example, if you have a permit renewal,
you may want to be reminded several times in the months leading up to the
renewal that action is required. For
this task, you can set the first reminder to go out 120 days before the due
date, and then another reminder at 90, 60, 30, and 5 days before the due date.3) Are there escalating notifications if a task
does not get closed out? By default, those listed in the CC
fields will be notified on task warning and past-due emails. Additionally, the site and business leaders
receive monthly status summaries from Compliance Calendar providing them with
an update on closure status. We also
offer an extension feature that escalates to the responsible person’s
supervisor X days before or after the due date – defined at the time the task
is created.4) Can I assign tasks to contractors? Do
they have to have user accounts to close out their tasks?There are a couple of ways that our
customers are engaging contractors with task management. If the contractor has a high-level of
involvement, like a consultant or a temporary worker, companies may choose to
set that contractor up with their own Benchmark | Gensuite account and assign tasks
directly to that individual. We also
offer an extension feature called “indirect closure” – when an task is assigned
to a contractor, they will receive an email attachment that will allow them to
close or add in-progress notes without having access to the Benchmark | Gensuite platform
and will be able to close it out directly from the attachment in that email.5) Can I assign the same task to multiple sites at once? Who does it
get assigned to? Can I see if every site has completed those tasks? Yes, users with higher levels of permissions
can submit tasks for multiple sites. 
Under the submit button at the bottom of the Add New Task page, there is
a link that can be used to select multiple sites as well as default the
responsible person to the site’s respective Site Lead, Manager, or Ops Lead. The Compliance Calendar Data Mining report can
be used to review the status of the tasks across all assigned sites. 6) Can I create a library of tasks and push them
to my sites? Yes, Compliance Calendar
administrators can create a library of standardized tasks by category, and
define the task frequency, email schedule, task plan, citations, and applicable
organizational scope. Site Leaders can view
the library and add them to their site’s calendar OR users with higher levels
of permission can use the “add to multiple sites” feature to push out
recommended tasks to multiple sites at once.7) What is a Conditional Task and how do they
work?The Conditional Task library is a
great way to establish contingency plans for certain scenarios. For example, if a report must be submitted to
a regulatory agency within 15 days of an air exceedance, or a sanitation plan
if an employee at the site is tests positive for COVID-19. Each conditional
task contains the task plan, responsible person and other details necessary for
quick activation on occurrence of the event.8) I’m going to be Out of Office, is there a way
to temporarily reassign my responsibilities?Yes, Benchmark | Gensuite offers an Out of Office
delegator for Compliance Calendar, where users can select another user to
delegate their Compliance Calendar responsibilities to for a period of
time. To access this, click on your name
in the top bar and select Out of Office.9) Someone has left my company; is there an easy
way to reassign their responsibilities?Yes, via Contacts Database system
administrators can reassign a user’s responsibilities in bulk.10) Can I associate specific regulatory
requirements and citations to my calendar tasks?Yes, by default, you
can associate one or more regulatory citations to a calendar task. If there are specific sections of permits,
ordinances, licenses, or documents that you would like to catalog and associate
to a calendar task, we also offer an extension feature called the Task Basis
Group & Requirement that allows for more detailed tracking & reporting
of requirements and citations. 11) Can I have someone verify the closure of a
task before it is formally closed out in the system? Yes, at the bottom of the add task
form, users creating the task have the option to select a closure verifier and
define a verification plan. This
individual will receive an email notification once the task has been completed
by the responsible person(s) and will have an opportunity to approve or reject
the closure.12) Does Benchmark | Gensuite provide a library of compliance
tasks that can be selected from to get startedThis is not available out of the box,
but we work with a number of service partners (i.e. STC) that can assist in
procuring a library of tasks based on industry, operations, and location.13) Is it possible to enable only Compliance Calendar without activate ATS for different sites?Yes, there's a setup variable configuration called splitAppActivationATSCC. By enabling it, the applications will appear as separate apps in SMT, allowing you to activate them independently for the sites where needed.14) How can we replicate application setup and configurations from one business to another?

Step 1: Migrate Customization Files from Source to Target Business

Copy all customization files related to the source business (identified by BUSID in file names or content, e.g., custom JS files) to the target business.

-Replace the source BUSID with the target BUSID in:
File names
File contents
Maintain the same folder structure
Create files/folders if they don’t exist
Do not overwrite existing files without confirmation

-Automation prompt:
BASE_PATH=DevMumbai/SymriseAppSetup/
SOURCE_BUSID=1248
TARGETS=(AmeriTerpenes LLC,2200)
SCAN_DIRS=calendar

Under BASE_PATH, scan audit/ and calendar/ for all customizations for SOURCE_BUSID; replicate path, filename, and content for each TARGET_BUSID with token-safe replacement; log found/created/skipped; never overwrite without confirmation.

​Step 2: Verify and Sync Business Setup Files

Check whether the setup files for the source and target business are identical in the stage environment.

 Navigate to the source business setup file path:
 `\\<StageServer>\Business\...\<App>\setup<app>.cfm`
(Example: `GSUSE1STAGE10V\AdaniCompany\adani\ehs\calendar\setup.cfm`)
 Locate the corresponding setup file for the target business Go to EHS or QLTY folder based on the subscribed module Compare both files: -If differences exist, copy the setup file from the source business to: The target business server > setup file
 And, the default stage server (20V stage or equivalent)​15) Compliance Calendar add task form: A business is missing the "Enable Indirect User Task Updates?" Field and its checkbox text?​16) Compliance Calendar Datamining:"Personal alerts: Compliance Assurance" report is missing for a business?​
---

# Inspection Tool - ATS Integration
Content ID: 2828
URL: https://tools.benchmarkdigital.com/kb/#content/2828
Products: Action Tracking System
Type: Guides
Last Modified: 2025-10-14 10:52:53
Author: Ruben Romo
Tags: Inspection Tool
Org Tags: Product Development and Operations
ATS STATUSFindingQn table - ATS Export status:ExportATS = 0 – not exported
ExportATS = 1 – exported to ATS
ExportATS = 2 - Export not requiredPULLING ATS ACTIONSThe "Pit_findingqn_nc" table joins PIT vs ATS by using the exported question "findingQnID".ATS AUTO EXPORTTo determine when action was auto-exported to ATS, you should look into "tblAudit" table from "Description" column contains 'Auto Export to ATS%' or '%Auto Exported Finding%' e.g.:
---

# Management Systems Scorecard - ATS exporting workflow
Content ID: 3481
URL: https://tools.benchmarkdigital.com/kb/#content/3481
Products: Action Tracking System
Type: Guides
Last Modified: 2026-05-18 17:29:01
Author: Ruben Romo
Tags: Framework Scorecard
Org Tags: Product Development and Operations
ATS Find ActionsFiltery by RefType:Framework ScorecardIngersollRandRefID structure:Scorecard ATS:BASE_EXPORT and IMPR_EXPORT stores the question(s) applicable to export e.g.:​Data Mining and Gap Report only pulls the exported items from most recent revision score, e.g. if archived score has exported ATS actions , they won't appear from reports.
---

# PIT- ATS Export
Content ID: 2827
URL: https://tools.benchmarkdigital.com/kb/#content/2827
Products: Action Tracking System
Type: Guides
Last Modified: 2025-07-09 02:54:55
Author: Abbas Khan
Tags: Inspection Tool
Org Tags: Product Development and Operations
PIT - ATS Export

How many ways are there to export the findings to ATS?

Automatically

Manually

How to set up the Checklist for ATS

While creating the checklist, if you uncheck the option "Allow export to Concern Reporting", the findings will be exported to ATS.

Afte the checklist is setup and checklist is Assignment created . 

1. Automatically Export to ATS

If a responsible person is selected while performing the inspection, the findings will be automatically exported to ATS.

2. Manually Export to ATS

If a responsible person is not selected while performing the inspection, the finding will be marked as "Pending Export to ATS" on the Inspection Summary page.

When we click on Export, it will redirect to the ATS application, where we need to fill in the required information and manually export the finding.

All Exported info will stored in tblAudit table. and tblAuditid will stored in Pit_findingqn_nc table for refference. from PIT Side all the finding are storing in Pit_findingqn_nc table .

​

Sample Query:

select top 1000 n.updateBy,n.* from Pit_findingqn_nc n with(nolock)
join FindingQn fqn with(nolock) on fqn.FindingID=n.FindingID
where fqn.AuditRecNo='731013'

​
---

# RBS - ATS Exporting Model
Content ID: 2555
URL: https://tools.benchmarkdigital.com/kb/#content/2555
Products: Action Tracking System
Type: Guides
Last Modified: 2025-10-06 19:03:37
Author: Ruben Romo
Tags: EHS Framework
Org Tags: All Team
ATS DEFAULT EXPORT MODELTo export questions to ATS it would depend on the "option set" business configuration that's setup from the composer page, businesses commonly use the option "No" for export their questions. e.g.:How to export questions to ATSOnce created an element score, if one or more of their questions are flagged as "No", those questions would be applicable to ATS Export, to see them user should click on "Manage Actions" link from scoring page:Once located on "Manage Findings" page, user could decide over which ones of them should be exported to ATS:Once actions are exported user could continue the follow up of the actions from ATS side, or if business has the "esc_showExportedFindings " feature enabled, all the exported actions would appear below the element question. e.g:NOTE: The default ATS Exporting model when using the aforementioned feature, all the exported items including from archived scores would be shown.Backend perspective:It pulls the exported actions linked at "questionID" level from "esc_answer" table.ATS MULTIPLE EXPORT MODELThe ATS Multiple exporting model gets activated when the feature is enabled, it allows export multiple items from the flagged question only when user clicks over "Add Corrective Action" from scoring page e.g.:The user would be able to select the number of actions to export, currently it has limitation of 12 for performance and design purposes:NOTE: The multiple exporting model FW2.0 shows the actions that were exported from the element viewed and from archived scores.Backend perspective:It pulls the exported actions from current and archived scores tied at "questionID" from "tblAudit" table regardless the "eesid".ATS TABLE DETAILSRefType: ESCRefID: entityelementscoreid . questionid
---

# What is a PAFR and how are action items tracked?
Content ID: 306
URL: https://tools.benchmarkdigital.com/kb/#content/306
Products: Action Tracking System
Type: Procedure
Last Modified: 2023-05-09 13:44:57
Author: Fernando Rodriguez
Tags: Contributor,Pending Assignment by Org
Org Tags: Strategic Relationship Management
The Priority
Application Failure Resolution (PAFR) process intended to help us
to track our SLA Priority team bug-fixes that have been
impacted on our customer’s experience and need to be resolved quickly. VEs/PM App
Directors are responsible for selectively identifying high priority
issues to add to the list, e.g., (1) only timeouts that
are taking down the server or impacting a broad group of users; (2) only
failed tasks that have a visible customer deliverable;
(3) only malfunctions that affect
multiple users or impair critically important functionality.
Once an item has been identified as applicable to the PAFR
process, an action item will be loaded into Benchmark Portal by the Monitoring
Team – see using the steps outlined below:1.
Click on the New Request button from Benchmark Portal and select Team
from the menu. 

2.
Select SLA Violator Follow-up as request type and check High
Priority Issue checkbox. 
 Select a Category - You will be able to
 select the type of the issue regarding three possible scenarios: 1) Failed
 Task, 2) Malfunction and 3) Recurring Timeout. Please see
 guidance text on the page for a description of each.
 Select Business where
 applicable. This field is not required,
 so that you can select the business instance or leave blank to note that it
 affects all.
 The rest of the fields will be complete for submittal.
 Note the due date field will be auto programmed to be completed two days
 after the request submission.
Automatic
Email Notifications are sent out to keep everyone in the loop and ensure movement
to close out these PAFRs:
 Email Notification on Submit – the Assigned To and anyone on the CC list will be notified
 immediately through a High Priority email notification
 on.
 Daily Email Notification – a summary notification will be triggered daily around
 10:00 AM ET to the Assigned Leads, PM Vertical Executives, PM
 Application D-list (for affected applications) and CSD Customer Support
 d-list (for affected customers) for visibility and closure tracking. The
 daily notification will be mailed only for action items with the status
 in: Open Past Due, Open and Closed within
 the last 24 hours.