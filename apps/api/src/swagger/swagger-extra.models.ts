import { LegacyHttpErrorDto, FullEnvelopeErrorResponseDto, EnvelopeErrorBlockDto } from '../common/dtos/error-response.dto';
import { SuccessEnvelopeWrapperDto } from '../common/dtos/response-envelope.dto';
import { HealthCheckResponseDto } from '../common/dtos/health-check-response.dto';
import { AuthSessionResponseDto, AuthUserSummaryDto } from '../modules/auth/dto/auth-session-response.dto';
import {
  CaktoWebhookPayloadDto,
  MercadoPagoWebhookPayloadDto,
  StripeWebhookEventPayloadDto,
} from '../modules/payments/presentation/dtos/payment-webhooks.dto';
import { IfoodWebhookPayloadDto } from '../modules/ifood/presentation/dtos/ifood-webhook-payload.dto';
import { StorageMultipartUploadDto } from '../modules/storage/presentation/dtos/storage-multipart.dto';
import { PaginationMetaDto } from '../common/dtos/pagination.dto';
import { RateLimitErrorBodyDto } from '../common/dtos/rate-limit-error.dto';
import {
  CreateOrderResponseDto,
  ListOrdersResponseDto,
  OrderDetailResponseDto,
  OrderLineItemResponseDto,
  OrderPanelRowDto,
  OrderPaymentRowDto,
  TrackOrderResponseDto,
  UpdateOrderStatusResponseDto,
} from '../modules/orders/presentation/dtos/order-response.dto';
import {
  ProductCategoryDetailDto,
  ProductCategoryPanelSummaryDto,
  ProductCategoryPublicSummaryDto,
  ProductDetailResponseDto,
  ProductPanelListItemResponseDto,
  ProductPersistedResponseDto,
  ProductPublicListItemResponseDto,
} from '../modules/products/dtos/product-response.dto';
import {
  CategoriesReorderResponseDto,
  CategoryPanelListItemResponseDto,
  CategoryPersistedResponseDto,
  CategoryProductCountDto,
  CategoryPublicWithProductsResponseDto,
} from '../modules/categories/dtos/category-response.dto';
import { IdResponseDto, OkFlagResponseDto, StripeWebhookAckResponseDto, UrlPayloadResponseDto } from '../common/dtos/simple-contract.dto';
import { StoreConfigResponseDto, StoreTenantPublicSummaryDto } from '../modules/stores/dtos/store-response.dto';
import {
  UserMeResponseDto,
  UserProfileResponseDto,
  UserRoleRowResponseDto,
  UserTenantSummaryResponseDto,
} from '../modules/users/dtos/user-response.dto';
import {
  TenantOrdersCountResponseDto,
  TenantPersistedResponseDto,
  TenantUserEmailResponseDto,
  TenantWithStoreConfigResponseDto,
} from '../modules/tenants/dtos/tenant-response.dto';
import {
  CouponPersistedResponseDto,
  CouponValidatedSnapshotDto,
  ValidateCouponResponseDto,
} from '../modules/coupons/presentation/dtos/coupon-response.dto';
import {
  RpcCanCreateResourceResponseDto,
  RpcCreateStoreAdminResponseDto,
  RpcCustomerProfileResponseDto,
  RpcIfoodCredentialPersistedResponseDto,
  RpcIfoodCredentialsSafeResponseDto,
  RpcInactiveCustomerRowDto,
  RpcMpGatewayAdminResponseDto,
  RpcPaymentGatewayPersistedResponseDto,
  RpcPixConfigResponseDto,
  RpcPlanLimitsResponseDto,
  RpcResolveStoreResponseDto,
  RpcResolveTableTokenResponseDto,
} from '../modules/rpcs/presentation/dtos/rpcs-response.dto';
import {
  CashMovementRowResponseDto,
  CashRegisterPersistedResponseDto,
  CashRegisterWithMovementsResponseDto,
} from '../modules/cash/presentation/dtos/cash-response.dto';
import { RestaurantTablePersistedResponseDto } from '../modules/tables/presentation/dtos/table-response.dto';
import {
  TabDetailResponseDto,
  TabListItemResponseDto,
  TabListTableSummaryDto,
  TabOrderRowResponseDto,
  TabPersistedResponseDto,
  TabTableSummaryDto,
} from '../modules/tabs/presentation/dtos/tab-response.dto';
import {
  BillingSubscriptionSummaryResponseDto,
  BillingSummaryDataDto,
  BillingSummaryErrorDto,
  MercadoPagoPreferenceResponseDto,
  StripeUrlNullableResponseDto,
} from '../modules/payments/presentation/dtos/payment-response.dto';
import {
  WhatsappContactRowDto,
  WhatsappContactsListMetaDto,
  WhatsappContactsListResponseDto,
  WhatsappMessageRowDto,
  WhatsappMessagesListResponseDto,
  WhatsappSendMessageResponseDto,
} from '../modules/whatsapp-contacts/presentation/dtos/whatsapp-contacts-response.dto';
import { PushBroadcastQueuedResponseDto, PushSubscriptionPersistedResponseDto } from '../modules/push/push-response.dto';
import {
  CrmCustomerDetailResponseDto,
  CrmCustomerOrderMiniDto,
  CrmCustomerProfileRowDto,
  CrmCustomersListResponseDto,
  CrmMetricsResponseDto,
  CrmResegmentJobResponseDto,
  CrmTopSpenderRowDto,
} from '../modules/crm/presentation/dtos/crm-response.dto';
import {
  AnalyticsDashboardResponseDto,
  AnalyticsEventPersistedResponseDto,
  AnalyticsMonthlySnapshotResponseDto,
  AnalyticsPeakHourRowDto,
  AnalyticsPriceSuggestionActionDto,
  AnalyticsPriceSuggestionRowDto,
  AnalyticsTopProductRowDto,
} from '../modules/analytics/presentation/dtos/analytics-response.dto';
import {
  MpCheckoutAvailabilityResponseDto,
  ResumeCaktoCheckoutResponseDto,
  StripeUserSubscriptionCheckResponseDto,
} from '../modules/payment-gateways/presentation/dtos/payment-gateways-response.dto';
import { DomainManageOperationResponseDto, DomainTenantStatusResponseDto } from '../modules/domains/presentation/dtos/domains-response.dto';
import { OtpSendResponseDto, OtpVerifyResponseDto } from '../modules/otp/presentation/dtos/otp-response.dto';
import { StoreSignupFlowResponseDto } from '../modules/signup/presentation/dtos/signup-response.dto';
import {
  MigrationCanaryRolloutResponseDto,
  MigrationHealthCheckRowDto,
  MigrationHealthResponseDto,
  MigrationSetFlagResponseDto,
  MigrationStatusResponseDto,
  MigrationTenantCountsDto,
  MigrationTenantFlagsResponseDto,
} from '../modules/migration/presentation/dtos/migration-response.dto';
import { StorageUploadResultResponseDto } from '../modules/storage/presentation/dtos/storage-upload-response.dto';
import {
  IfoodAuthActionResultResponseDto,
  IfoodDisconnectOkResponseDto,
  IfoodIntegrationStatusResponseDto,
  IfoodOAuthCallbackOkResponseDto,
  IfoodOAuthUrlResponseDto,
  IfoodSyncOrderStatusResponseDto,
} from '../modules/ifood/presentation/dtos/ifood-response.dto';

/** Modelos registrados explicitamente para \`getSchemaPath\` em decorators compostos. */
export const SWAGGER_EXTRA_MODELS = [
  LegacyHttpErrorDto,
  FullEnvelopeErrorResponseDto,
  EnvelopeErrorBlockDto,
  SuccessEnvelopeWrapperDto,
  HealthCheckResponseDto,
  AuthUserSummaryDto,
  AuthSessionResponseDto,
  StripeWebhookEventPayloadDto,
  CaktoWebhookPayloadDto,
  MercadoPagoWebhookPayloadDto,
  IfoodWebhookPayloadDto,
  StorageMultipartUploadDto,
  PaginationMetaDto,
  RateLimitErrorBodyDto,
  OrderLineItemResponseDto,
  OrderPaymentRowDto,
  OrderPanelRowDto,
  CreateOrderResponseDto,
  ListOrdersResponseDto,
  TrackOrderResponseDto,
  OrderDetailResponseDto,
  UpdateOrderStatusResponseDto,
  ProductCategoryPublicSummaryDto,
  ProductCategoryPanelSummaryDto,
  ProductCategoryDetailDto,
  ProductPersistedResponseDto,
  ProductPublicListItemResponseDto,
  ProductPanelListItemResponseDto,
  ProductDetailResponseDto,
  CategoryPersistedResponseDto,
  CategoryProductCountDto,
  CategoryPanelListItemResponseDto,
  CategoryPublicWithProductsResponseDto,
  CategoriesReorderResponseDto,
  StripeWebhookAckResponseDto,
  OkFlagResponseDto,
  UrlPayloadResponseDto,
  IdResponseDto,
  StoreTenantPublicSummaryDto,
  StoreConfigResponseDto,
  UserProfileResponseDto,
  UserRoleRowResponseDto,
  UserTenantSummaryResponseDto,
  UserMeResponseDto,
  TenantPersistedResponseDto,
  TenantUserEmailResponseDto,
  TenantOrdersCountResponseDto,
  TenantWithStoreConfigResponseDto,
  CouponPersistedResponseDto,
  CouponValidatedSnapshotDto,
  ValidateCouponResponseDto,
  RpcResolveStoreResponseDto,
  RpcPixConfigResponseDto,
  RpcResolveTableTokenResponseDto,
  RpcCustomerProfileResponseDto,
  RpcPlanLimitsResponseDto,
  RpcCanCreateResourceResponseDto,
  RpcInactiveCustomerRowDto,
  RpcIfoodCredentialsSafeResponseDto,
  RpcIfoodCredentialPersistedResponseDto,
  RpcMpGatewayAdminResponseDto,
  RpcPaymentGatewayPersistedResponseDto,
  RpcCreateStoreAdminResponseDto,
  CashRegisterPersistedResponseDto,
  CashMovementRowResponseDto,
  CashRegisterWithMovementsResponseDto,
  RestaurantTablePersistedResponseDto,
  TabListTableSummaryDto,
  TabListItemResponseDto,
  TabTableSummaryDto,
  TabOrderRowResponseDto,
  TabDetailResponseDto,
  TabPersistedResponseDto,
  BillingSummaryDataDto,
  BillingSummaryErrorDto,
  BillingSubscriptionSummaryResponseDto,
  StripeUrlNullableResponseDto,
  MercadoPagoPreferenceResponseDto,
  WhatsappContactsListMetaDto,
  WhatsappContactRowDto,
  WhatsappContactsListResponseDto,
  WhatsappMessageRowDto,
  WhatsappMessagesListResponseDto,
  WhatsappSendMessageResponseDto,
  PushSubscriptionPersistedResponseDto,
  PushBroadcastQueuedResponseDto,
  CrmCustomerProfileRowDto,
  CrmCustomersListResponseDto,
  CrmTopSpenderRowDto,
  CrmMetricsResponseDto,
  CrmCustomerOrderMiniDto,
  CrmCustomerDetailResponseDto,
  CrmResegmentJobResponseDto,
  AnalyticsEventPersistedResponseDto,
  AnalyticsDashboardResponseDto,
  AnalyticsTopProductRowDto,
  AnalyticsPeakHourRowDto,
  AnalyticsPriceSuggestionActionDto,
  AnalyticsPriceSuggestionRowDto,
  AnalyticsMonthlySnapshotResponseDto,
  MpCheckoutAvailabilityResponseDto,
  StripeUserSubscriptionCheckResponseDto,
  ResumeCaktoCheckoutResponseDto,
  DomainTenantStatusResponseDto,
  DomainManageOperationResponseDto,
  OtpSendResponseDto,
  OtpVerifyResponseDto,
  StoreSignupFlowResponseDto,
  MigrationTenantCountsDto,
  MigrationStatusResponseDto,
  MigrationHealthCheckRowDto,
  MigrationHealthResponseDto,
  MigrationSetFlagResponseDto,
  MigrationTenantFlagsResponseDto,
  MigrationCanaryRolloutResponseDto,
  StorageUploadResultResponseDto,
  IfoodOAuthUrlResponseDto,
  IfoodOAuthCallbackOkResponseDto,
  IfoodIntegrationStatusResponseDto,
  IfoodDisconnectOkResponseDto,
  IfoodAuthActionResultResponseDto,
  IfoodSyncOrderStatusResponseDto,
];
