# Inventário de operações da API do Imobzi

411 operações extraídas dos bundles JavaScript do app (`my.imobzi.com/build/*.js`, 162 chunks,
levantamento de 15/08/2026) pelo script [tools/extract-endpoints.mjs](tools/extract-endpoints.mjs).

Como ler:

- **Método e caminho** vêm das chamadas `_request.new_get/new_post/new_put/new_delete(apiUrl() + …)`
  no código do app — são confiáveis.
- **Função no app** é o nome do método do serviço Angular/Ionic que faz a chamada. Serve para achar
  o call site no bundle e descobrir os parâmetros.
- `{n}`, `{l}`, `{n.db_id}` são as variáveis do código minificado na posição do path param.
- **Nada aqui foi exercitado**, exceto os endpoints documentados no [README](README.md#endpoints-usados-no-fechamento).
  Para esses, o schema de resposta está em [api-spec/](api-spec/).

Base: `https://my.imobzi.com/v1`.

## Financeiro — faturas

| Método | Caminho | Função no app |
|---|---|---|
| POST | `/invoice/{n.invoice_id}` | update |
| POST | `/invoice/{n.invoice_id}/duplicate` | duplicate |
| POST | `/invoice/{n.invoice_id}/send-notification?notification_type={l}` | sendEmail |
| GET | `/invoice/{n}` | get |
| GET | `/invoices` | getList |
| POST | `/invoices` | create |
| POST | `/recalculate/irrf/{n.lease.db_id}/{n.invoice_id}` | recalculateIrrf |

## Financeiro — lançamentos e contas

| Método | Caminho | Função no app |
|---|---|---|
| GET | `/banks` | getBanksWebService |
| GET | `/checking-account/transaction` | getList |
| POST | `/financial/account/{l}/conciliation` | updateConciliationTransaction |
| DELETE | `/financial/account/{n.db_id}` | deleteAccount |
| POST | `/financial/account/{n.db_id}` | updateAccount, updateAccountForBankConnection, generateItauKeys |
| GET | `/financial/account/{n}` | getAccount |
| GET | `/financial/account/{n}/conciliation/transaction/{l.id}` | getConciliationMatch |
| GET | `/financial/accounts` | requestAccounts |
| POST | `/financial/accounts` | createAccount |
| GET | `/financial/categories` | getList |
| POST | `/financial/categories` | create |
| POST | `/financial/category/{n.db_id}` | update |
| POST | `/financial/category/{n.db_id}?action=move_transactions` | moveTransactions |
| DELETE | `/financial/category/{n}` | delete |
| GET | `/financial/category/{n}` | get |
| GET | `/financial/organization` | getOrganization |
| GET | `/financial/tags` | getTags |
| GET | `/financial/transaction/{l}/{n}/match` | getTransactionsMatch |
| POST | `/financial/transaction/{n.transaction_id}{i}` | update |
| DELETE | `/financial/transaction/{n}` | delete |
| GET | `/financial/transaction/{n}` | get |
| DELETE | `/financial/transaction/attachments?attachment_id={n}` | delete, deleteAttachment |
| GET | `/financial/transactions` | getList |
| POST | `/financial/transactions` | create |
| GET | `/financial/transactions/conciliation-match` | getConciliations |

## Financeiro — repasses a locadores

| Método | Caminho | Função no app |
|---|---|---|
| GET | `/commission/onlending` | getCommissionReport |
| GET | `/financial/landlord/account/{n}` | get |
| GET | `/financial/landlord/account/{n}/onlending` | getOnlendingReport |
| POST | `/financial/landlord/account/{n}/transaction/{l}` | update |
| GET | `/financial/landlord/account/{n}/transactions` | getList, get |
| POST | `/financial/landlord/account/{n}/transactions` | create |
| GET | `/financial/landlord/account/onlending/{n}` | getOnlendingByInvoice |
| GET | `/financial/landlord/accounts` | getList |
| POST | `/reports/commission/onlending` | getCommissionReportFile |
| GET | `/reports/landlord/account/onlending` | getIndividualOnlendingReport |
| POST | `/reports/landlord/account/onlending` | getOnlendingReportFile |
| GET | `/reports/landlord/income` | getIncomeReports |

## Contratos (locações)

| Método | Caminho | Função no app |
|---|---|---|
| GET | `/annual-readjustments` | getAnnualReadjustments |
| GET | `/annual/readjustment` | getAnnualReadjustmentItems |
| GET | `/contract-fields` | getContractFieldsGrouped |
| DELETE | `/contract/{n}` | deleteContract |
| POST | `/contract/code/{n.code}` | updateContract |
| GET | `/contract/code/{n}` | getContractByCode |
| GET | `/contracts` | getContracts |
| POST | `/contracts` | createContract |
| GET | `/lease-fields` | getLeaseFieldsGrouped |
| POST | `/lease/{n.db_id}` | updateContract, updateLeaseChecklist, updateLeaseFiles |
| DELETE | `/lease/{n}` | deleteContract |
| GET | `/lease/{n}` | getLeaseByID, getContract |
| GET | `/lease/calculate-insurance` | calculateInsurance, calculateGuarantee, calculateCredPagoGuarantee |
| POST | `/lease/calculate?type=beneficiary` | calculateBeneficiaryValues |
| POST | `/lease/calculate?type=invoice` | — |
| POST | `/lease/calculate?type=invoice_reference` | calculateInvoiceEndAtReference, calculateInvoiceStartAtReference |
| POST | `/lease/calculate?type=lease_rescission_value` | calculateProportionalDaysTermination |
| POST | `/lease/calculate?type=management_fee` | calculateManagementFee |
| POST | `/lease/calculate?type=period_by_duration` | calculateEndDate |
| POST | `/lease/calculate?type=period_by_end_at` | calculateDuration |
| POST | `/lease/calculate?type=start_at_by_duration` | calculateStartAt |
| POST | `/lease/calculate?type=vacation_rental_installments` | calculateVacationRentalInstallments |
| POST | `/lease/cancel-insurance` | cancelFireInsurance |
| GET | `/lease/checklist` | getChecklist |
| GET | `/lease/code/{n}` | getLeaseByCode |
| POST | `/lease/hire-insurance` | contractInsurance, contractGuarantee, contractCredPago |
| GET | `/lease/item-description` | getItemDescriptions |
| POST | `/lease/no-cancellation-insurance` | noCancelationFireInsurance |
| GET | `/leases` | getLeases |
| POST | `/leases` | insertContract |

## Nota fiscal

| Método | Caminho | Função no app |
|---|---|---|
| GET | `/enotas/parameters/city` | getCityHallParameters |
| GET | `/enotas/parameters/company` | getCurrentCompanyInfo |
| DELETE | `/nota-fiscal/{n.db_key}` | delete |
| POST | `/nota-fiscal/{n.db_key}` | update |
| POST | `/nota-fiscal/{n.db_key}/send-email` | sendByEmail |
| GET | `/nota-fiscal/{n}` | getByUrlSafe |
| GET | `/nota-fiscal/landlord/{n}/transactions` | getManagementFeeNotLinked |

## Relatórios

| Método | Caminho | Função no app |
|---|---|---|
| GET | `/reports` | getReportGroups |
| POST | `/reports` | insertReport |
| POST | `/reports/{n.db_key}` | updateReport |
| DELETE | `/reports/{n}` | deleteReport |
| GET | `/reports/{n}` | getReport |
| POST | `/reports/{n}` | restoreReport |
| GET | `/reports/{n}/view{i}` | getReportView |
| POST | `/reports/commission/onlending` | getCommissionReportFile |
| GET | `/reports/deals-done` | getDealsDone |
| POST | `/reports/export/{n}/{l}` | exportReport |
| GET | `/reports/landlord/account/onlending` | getIndividualOnlendingReport |
| POST | `/reports/landlord/account/onlending` | getOnlendingReportFile |
| GET | `/reports/landlord/income` | getIncomeReports |
| GET | `/reports/properties` | getListingPropertyCount, getPropertiesDataAverage |
| GET | `/reports/site-analytics` | getSiteAnalytics |
| GET | `/reports/user-performance/` | getUsersPerformance |
| GET | `/reports/user-performance/{n}` | getUserPerformance |

## Imóveis

| Método | Caminho | Função no app |
|---|---|---|
| DELETE | `/adverts/site-highlight/{e}/{u}` | removePropertiesSiteHighlights |
| GET | `/adverts/site-highlights` | requestGetSiteHighlights |
| POST | `/adverts/site-highlights` | createPropertiesSiteHighlights |
| PUT | `/adverts/site-highlights` | reorderPropertiesSiteHighlights |
| POST | `/buildings-orulo/{n}` | setOruloPropertyDetails |
| GET | `/properties` | getProperties |
| POST | `/properties` | insertPropertyWs |
| DELETE | `/properties/{n}/photos/{l}?media_type=photo` | deletePropertyPhoto |
| POST | `/properties/generate/description` | generateDescriptionChatGPT |
| GET | `/properties/map` | getPropertiesMap |
| POST | `/properties/photos/report` | generateOfferLetterReportLink |
| GET | `/property-adverts` | getAdverts |
| POST | `/property-adverts` | create |
| DELETE | `/property-adverts/{n}` | delete |
| GET | `/property-adverts/{n}` | getAdvertFromModal, getAdvert |
| POST | `/property-adverts/{n}` | updateAdvert |
| GET | `/property-adverts/{n}/logs` | getAdvertLogsReport |
| GET | `/property-buildings/search` | getBuildingsFromSearch, getSalesMirrorDetails |
| GET | `/property-cities` | getPropertiesCity |
| POST | `/property-clone/{n}` | cloneProperty |
| POST | `/property-feature/{n.db_id}` | updatePropertyFeature |
| DELETE | `/property-feature/{n}` | deletePropertyFeature |
| GET | `/property-features` | getPropertyFeaturesGrouped |
| POST | `/property-features` | insertPropertyFeature |
| GET | `/property-fields` | getPropertyFieldsGrouped |
| POST | `/property-reserve/{n.db_id}` | updateReserve |
| DELETE | `/property-reserve/{n}` | deleteReserve |
| GET | `/property-reserve/{n}` | getReserve |
| GET | `/property-reserves` | getReserveList |
| POST | `/property-reserves` | createReserve |
| GET | `/property-shared/{n}` | getByKey |
| DELETE | `/property-types` | deletePropertyTypeWS |
| GET | `/property-types` | getPropertyTypesWS |
| POST | `/property-types` | insertPropertyType |
| DELETE | `/property/{n.db_id}` | deleteProperty |
| POST | `/property/{n.db_id}` | updatePropertyWs |
| GET | `/property/{n}` | getBuildingData |
| GET | `/property/{n}/adverts` | getPropertyAdverts |
| GET | `/property/{n}/calendar-items` | getPropertyCalendarItems |
| GET | `/property/{n}/deals-match` | getPropertyDealsMatch |
| GET | `/property/{n}/deals-statistics` | getPropertyDealStatistics |
| POST | `/property/{n}/quality` | getPropertyQuality |
| GET | `/property/{n}/statistics` | getVisitsProperty |
| GET | `/property/{n}/thumbnail` | getPropertyImageWs |
| GET | `/property/average-value/{n}/{l}` | getAverageRegionValue |
| GET | `/property/exists` | propertyExists |
| GET | `/property/match-reports` | getPropertyMatchs |
| POST | `/property/range-areas` | getRangeAreas |
| POST | `/property/range-values` | getRangeValues |
| POST | `/property/search-suggestion` | getPropertiesFromSearchSuggestion |
| POST | `/property/search?{i.join}` | getPropertiesFromSearchWs |

## Contatos e CRM

| Método | Caminho | Função no app |
|---|---|---|
| GET | `/calendar` | getCalendarEvents |
| POST | `/calendar` | insertCalendarItem |
| DELETE | `/calendar-item/{n}` | deleteCalendarItem |
| GET | `/calendar-item/{n}` | getCalendarEvent |
| GET | `/calendar-types` | getCalendarTypes |
| POST | `/calendar-types` | createCalendarType |
| POST | `/calendar-types/{l}` | updateCalendarType |
| DELETE | `/calendar-types/{n}` | deleteCalendarType |
| GET | `/chat-conversations` | getConversationsList |
| POST | `/chat-conversations` | createConversation |
| GET | `/contact/exists` | contactExists |
| POST | `/contact/tags/{l}` | updatedTag |
| DELETE | `/contact/tags/{n}` | deleteTag |
| GET | `/contacts` | getContacts |
| GET | `/contacts/profile-image` | getPhotoProfile |
| GET | `/contacts/profile-picture` | getProfilePicture |
| GET | `/contacts/search` | getContactsFromSearch |
| GET | `/contacts/tags` | getTags |
| POST | `/contacts/tags` | createTag |
| GET | `/deal-fields` | getDealFieldsGrouped |
| GET | `/deal-rotation/{n}` | getDealRotation |
| DELETE | `/deal-rotation/{String}` | deleteDealRotation |
| POST | `/deal-rotation/{String}` | updateDealRotation |
| POST | `/deal/{n.db_id}` | updateDeal |
| DELETE | `/deal/{n}` | deleteDeal |
| GET | `/deal/{n}` | getDeal |
| GET | `/deal/{n}/properties-match` | getPropertiesMatch |
| GET | `/deal/filter-fields` | getDealFilterField |
| POST | `/deal/filter/{n.db_id}` | updateDealFilter |
| DELETE | `/deal/filter/{n}` | deleteDealFilter |
| GET | `/deal/filters` | getDealFilters |
| POST | `/deal/filters` | createDealFilter |
| GET | `/deal/lost-reason` | getDealLostReasons |
| POST | `/deal/lost-reason` | createDealLostReason |
| POST | `/deal/lost-reason/{l}` | updatedDealLostReason |
| DELETE | `/deal/lost-reason/{n}` | deleteDealLostReason |
| GET | `/deal/range-areas` | getRangeAreas |
| GET | `/deal/range-values` | getRangeValues |
| GET | `/deals` | getDeals |
| POST | `/deals` | insertDeal |
| GET | `/deals-rotations` | getDealsRotations |
| POST | `/deals-rotations` | createDealRotation |
| GET | `/deals/search` | getDealsBySearch |

## Demais áreas

| Método | Caminho | Função no app |
|---|---|---|
| POST | `{a}` | createProposal |
| GET | `{c}` | getTimelineWS |
| DELETE | `{e}{n}` | deleteField |
| DELETE | `{i}` | removeNetworkGroupMember |
| POST | `{i}` | updateProposal |
| GET | `{r}` | getPropertyWs |
| POST | `{r}` | updateUser |
| GET | `{u}` | getProposals |
| POST | `{u}` | createField |
| POST | `{u}{n.field_id}` | updatedField |
| GET | `/{e}/{l}` | getContactBankData |
| DELETE | `/{l}/{n.db_id}` | deleteContactWS |
| GET | `/{l}/{n.db_id}` | getContactWs |
| POST | `/{l}/{n.db_id}` | updateContactWS |
| POST | `/{l}/check-permissions` | registerCheckPermissions |
| POST | `/{l}s` | insertContactWS |
| GET | `/{n}/vacation-calendar` | getVacationCalendarList |
| GET | `/analysis-fee` | getAnalysisFeeValues |
| GET | `/cf-analysis` | getAnalysisList |
| POST | `/cf-analysis` | insertAnalysis |
| POST | `/cf-analysis/{l.db_id}` | updateAnalysis |
| DELETE | `/cf-analysis/{l}` | deleteAnalysis |
| GET | `/cf-analysis/{l}` | getAnalysis |
| POST | `/cf-analysis/{n.db_id}` | updateAnalysis |
| DELETE | `/cf-analysis/{n}` | deleteAnalysis |
| GET | `/cf-analysis/{n}` | getAnalysis |
| GET | `/checklists` | getChecklistTemplates |
| POST | `/checklists` | createChecklistTemplate |
| DELETE | `/checklists/{n}` | deleteChecklist |
| PUT | `/checklists/{n}` | updateChecklist |
| GET | `/cities` | getPropertyCities, getCitiesWS |
| GET | `/dimob/{l.toString}` | getDimob |
| POST | `/dimob/{l.toString}` | generate, updateIssue |
| GET | `/document-fee` | getDocumentFeeValues |
| POST | `/document/{n.db_id}` | updateDocument |
| POST | `/document/{n.db_id}?reconcile=true` | reconcileDocument |
| POST | `/document/{n.db_id}/duplicate` | duplicate |
| DELETE | `/document/{n}` | deleteDocument |
| GET | `/document/{n}` | getDocument |
| POST | `/document/{n}/resend` | resendMessage |
| GET | `/documents` | getDocumentList |
| POST | `/documents` | insertDocument |
| DELETE | `/documents/files{u}` | deleteDocumentFile |
| PUT | `/documents/files{u}` | uploadLargeFile |
| GET | `/fire-insurance-simulation` | getAproxValueToFireInsurance |
| DELETE | `/google/oauth/events` | googleDisassociateAccount |
| POST | `/google/oauth/events` | updateCalendarItem |
| POST | `/hotscool/access` | hotscoolAccess |
| GET | `/hotscool/report` | getCoursesProgressReport |
| GET | `/integration/make` | getMakeScenarios |
| GET | `/integrations` | getIntegrations |
| POST | `/integrations` | updateIntegration |
| POST | `/login` | doLogin |
| POST | `/mail/{n.user_mail_key}` | updateEmail |
| DELETE | `/mail/{n}` | deleteEmail |
| GET | `/mail/{n}` | getEmail |
| GET | `/mails` | getEmails |
| GET | `/mails/search` | searchEmail |
| GET | `/measures/{n}` | getPropertyMeasures |
| POST | `/media-source/{n.db_id}` | updateWS |
| DELETE | `/media-source/{n}` | deleteWS |
| GET | `/media-sources` | getWS |
| POST | `/media-sources` | insertWS |
| GET | `/media-sources-report` | getReport |
| GET | `/neighborhoods` | getNeighborhoodsFromSearch, getNeighborhoodsWS |
| POST | `/neighborhoods` | insertNeighborhood |
| DELETE | `/neighborhoods/{n.db_id}` | deleteNeighborhood |
| POST | `/neighborhoods/{n.db_id}` | updateNeighborhood |
| POST | `/network-group` | createNewNetwork |
| POST | `/network-group-portal/{n}` | addNetworkPortal |
| GET | `/network-group/` | getNetworks |
| POST | `/network-group/{n.database}` | updateNetwork, inactivateNetwork |
| GET | `/network-group/{n}` | getNetwork |
| POST | `/network-group/{n}/{l}` | addNetworkGroupMember |
| PUT | `/network-group/{n}/{l}` | networkInvitationRequest |
| GET | `/network-group/invitations` | getPendingNetworkInvitations |
| GET | `/network-group/search` | getNetworkGroupFromSearch |
| GET | `/news` | getImobziNews |
| GET | `/notas-fiscais` | getList |
| POST | `/notas-fiscais` | create |
| POST | `/notification/{n}` | setNotificationRead |
| GET | `/notifications` | getNotifications |
| POST | `/notifications` | createNotification |
| GET | `/organization-fields` | getOrganizationFieldsGrouped |
| GET | `/parameters` | getParametersWS |
| POST | `/parameters` | updateParameters |
| GET | `/person-fields` | getPersonFieldsGrouped |
| GET | `/pipeline-groups` | getPipelineGroups |
| POST | `/pipeline-groups` | insertPipelineGroup |
| POST | `/pipeline-groups/{n.db_id}` | updatePipelineGroup |
| DELETE | `/pipeline-groups/{n}` | deletePipelineGroup |
| GET | `/pipeline-groups/{n}` | getPipelineGroup |
| POST | `/pipeline/{n.db_id}` | updatePipeline |
| DELETE | `/pipeline/{n}` | deletePipeline |
| GET | `/pipeline/{n}` | getPipeline |
| GET | `/pipelines` | getPipelineList |
| POST | `/pipelines` | insertPipeline |
| DELETE | `/product/{n.db_id}` | delete |
| PUT | `/product/{n.db_id}` | update |
| GET | `/products` | getList |
| POST | `/products` | create |
| GET | `/products/taxs/{l}` | getTaxsWS |
| POST | `/push-notification/easychat` | sendEasychatPush |
| GET | `/real-estate` | get |
| POST | `/real-estate` | update |
| GET | `/realtors` | getRealtorsFromSearch |
| DELETE | `/report-external-access/{n}` | revokeLink |
| GET | `/report-external-access/{n}` | getReportExternalAccess |
| POST | `/report-external-access/{n}` | generateLink |
| GET | `/report-structure` | getStructure |
| GET | `/report-structure/{n}` | getStructureBySource |
| GET | `/revision/{l}` | getRevisions |
| GET | `/revision/{l}/{n}` | getRevision |
| POST | `/revision/{l}/{n}` | restoreRevision |
| POST | `/send/{n}` | sendMessaging |
| POST | `/signup` | createAccount |
| GET | `/signup/verify-email` | sendEmailConfirmation, emailExists |
| POST | `/site-clear-cache` | postClearCache |
| POST | `/site-content/{n.db_key}` | updateContent |
| DELETE | `/site-content/{n}` | deleteContent |
| GET | `/site-content/{n}` | getContent |
| POST | `/site-content/generate` | generateContentByChatGPT |
| GET | `/site-contents` | getContents |
| POST | `/site-contents` | insertContent |
| GET | `/site-custom-button` | requestGetSiteCustomButton |
| POST | `/site-custom-button` | createSiteCustomButtom |
| PUT | `/site-custom-button` | updateSiteCustomButtom |
| POST | `/site-custom-button-reorder` | reorderCustomButtons |
| DELETE | `/site-custom-button/{n}` | deleteSiteCustomButtom |
| GET | `/site-details-page` | getSitePropertyDetails |
| POST | `/site-details-page` | updateSitePropertyDetails |
| DELETE | `/site-menu/{n.menu}/{n.db_id}` | deleteSiteMenu |
| POST | `/site-menu/{n.menu}/{n.db_id}` | updateSiteMenu |
| POST | `/site-menu/{n}` | updateSiteMenuGroupList |
| GET | `/site-menus` | getSiteMenu |
| POST | `/site-menus` | createSiteMenu |
| GET | `/site-pages-configuration` | requestGetSiteConfiguration |
| POST | `/site-pages-configuration` | postSiteConfiguration |
| POST | `/site-preview` | insertSitePreview |
| GET | `/site-search-locations` | getButtonSearchParams |
| DELETE | `/site-section/{n}` | deleteSection |
| POST | `/site/file/{n.name}` | renameFile |
| DELETE | `/site/file/{u}` | deleteFiles |
| GET | `/site/files` | getFiles |
| GET | `/site/image-bank` | getImagesPexel |
| GET | `/sites-popup-templates` | getSitePopupTemplates |
| POST | `/sites-popup-templates` | createSitePopup |
| DELETE | `/sites-popup/{n}` | deleteSitePopup |
| GET | `/sites-popup/{n}` | activeSitePopup |
| POST | `/sites-popup/{n}` | editSitePopup |
| GET | `/sites-popups` | getAllSitePopups |
| GET | `/states` | getStates |
| GET | `/subscription` | getSubscription |
| POST | `/subscription` | updateSubscription |
| GET | `/subscription/deployment-fees` | getDeploymentFees |
| GET | `/subscription/payment-method` | getSubscriptionPayment |
| GET | `/subscription/payment/invoices` | getSubscriptionInvoices |
| GET | `/subscription/plans/{n}` | getSubscriptionPlans |
| POST | `/support-tools/revoke-temp-access` | revokeTemporaryAccess |
| GET | `/text-template-fields` | getTextTemplateFields |
| POST | `/text-template/{n.db_id}` | updateTextTemplate |
| DELETE | `/text-template/{n}` | deleteTextTemplate |
| GET | `/text-template/{n}` | getTextTemplate |
| POST | `/text-template/{n}/transform{a}` | getTextTemplateTransformed |
| GET | `/text-template/search` | getTextTemplatesFromSearch |
| GET | `/text-templates` | getTextTemplates |
| POST | `/text-templates` | insertTextTemplate |
| DELETE | `/third-party-app/{n.db_id}` | deleteThirdPartyApp |
| POST | `/third-party-app/{n.db_id}` | updateThirdPartyApp |
| GET | `/third-party-apps` | getThirdPartyApps |
| POST | `/third-party-apps` | insertThirdPartyApp |
| GET | `/third-party-apps/secret-key` | generateThirdPartyAppsSecretKey |
| POST | `/timeline` | insertTimelineItem, insertTimelineChecklist, createChecklist |
| POST | `/timeline-item` | doneTimeline |
| DELETE | `/timeline-item/{e.key}` | deleteTimelineItem |
| DELETE | `/timeline-item/{n}` | deleteChecklist |
| GET | `/timeline-item/{n}` | getTimelineItem |
| POST | `/timeline-item/{n}` | updateTimelineItem |
| GET | `/tv-highlights` | getTVHighlights |
| POST | `/tv-highlights` | create |
| PUT | `/tv-highlights/{n.db_id}` | update |
| PUT | `/tv-highlights/{n.tv_id}/reorder` | reorderPropertiesTVHighlights |
| DELETE | `/tv-highlights/{n}` | delete |
| POST | `/tv-highlights/{n}/add` | addPropertiesTVHighlights |
| POST | `/tv-highlights/{n}/remove/{l}` | removePropertiesTVHighlights |
| GET | `/user-billing` | getUserBilling |
| GET | `/user-logs/{n}` | getUserLogs |
| GET | `/user-rules` | getRules |
| POST | `/user-team/{n.db_id}` | update |
| DELETE | `/user-team/{n}` | delete |
| GET | `/user-teams` | getAll |
| POST | `/user-teams` | create |
| POST | `/user/{n.uid}?resend-invite=true` | resendInvite |
| GET | `/user/{n}` | getUserById |
| POST | `/user/{n}?remove-user=true` | removeUser |
| GET | `/user/{n}/properties` | getUserProperties |
| GET | `/user/{n}/rules` | getUserRules |
| POST | `/user/{n}/rules` | updateUserRules |
| GET | `/user/emailvalid` | validateEmail |
| DELETE | `/user/mail-config` | removeUserMailConfig |
| GET | `/user/mail-config` | getMailConfig |
| POST | `/user/mail-config` | updateUserMailConfig |
| GET | `/user/migration-data` | getMigrations |
| POST | `/user/migration-data` | createMigration |
| GET | `/user/notification-token` | getToken |
| POST | `/user/notification-token` | saveToken, revokeToken |
| GET | `/user/profile` | userProfileGet |
| POST | `/user/push-permissions` | updatePermissions |
| GET | `/users` | getUserMemberNetwork, getUsers, getProfileByDatabase, getProfilesToTimelineNote |
| POST | `/users` | createUser |
| GET | `/users/ranking` | getUsersRanking |
| GET | `/utils/get-compound-interest` | getCompoundInterest |
| PUT | `/vacation-calendar` | updateValueCalendar |
| DELETE | `/webhook/{n.db_id}` | deleteWebhook |
| POST | `/webhook/{n.db_id}` | updateWebhook |
| GET | `/webhooks` | getWebhooksList |
| POST | `/webhooks` | createWebhook |
| POST | `/whatsapp-business/mark-messages-read` | markMessagesRead |
| POST | `/whatsapp-business/templates` | createTemplate |
| POST | `/whatsapp/{n.id}/chats/{l.id}` | updateChat, updateMessagesSeen, updateLastMessageRead |
| POST | `/whatsapp/{n}/logout` | revokeAccessWhatsapp |
| POST | `/whatsapp/{n}/revoke` | deleteNote |
| POST | `/whatsapp/account/{n}` | logoutWhatsappAccount |
