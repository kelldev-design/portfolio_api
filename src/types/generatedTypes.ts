import { GraphQLResolveInfo } from 'graphql';
import { MarketSeriesResult } from '../services/marketData';
import { Context } from '../graphql/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type Category = {
  __typename?: 'Category';
  id: Scalars['Int'];
  name: Scalars['String'];
};

export type CreatePortfolioItemResponse = {
  __typename?: 'CreatePortfolioItemResponse';
  code: Scalars['Int'];
  message: Scalars['String'];
  portfolioItem?: Maybe<PortfolioItem>;
  success: Scalars['Boolean'];
};

export type Link = {
  __typename?: 'Link';
  id: Scalars['Int'];
  isInternal: Scalars['Boolean'];
  label: Scalars['String'];
  type: LinkType;
  url: Scalars['String'];
};

export type LinkType = {
  __typename?: 'LinkType';
  id: Scalars['Int'];
  name: Scalars['String'];
};

export type MarketObservation = {
  __typename?: 'MarketObservation';
  date: Scalars['String'];
  value: Scalars['Float'];
};

export type MarketSeries = {
  __typename?: 'MarketSeries';
  category: Scalars['String'];
  fredId: Scalars['String'];
  label: Scalars['String'];
  lastFetchedAt?: Maybe<Scalars['String']>;
  /**
   * The most recent observation for the series overall. Unaffected by `from`/`to`,
   * so a windowed chart query still reports the current value.
   */
  latest?: Maybe<MarketObservation>;
  /** Observations for the series, narrowed by the `from`/`to` query arguments. */
  observations: Array<MarketObservation>;
  /** The observation before `latest`, for computing the change. Unaffected by `from`/`to`. */
  previous?: Maybe<MarketObservation>;
  unit: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createPortfolioItem?: Maybe<CreatePortfolioItemResponse>;
};


export type MutationCreatePortfolioItemArgs = {
  categories: Array<Scalars['Int']>;
  description: Scalars['String'];
  homeImage: Scalars['Int'];
  links: Array<Scalars['Int']>;
  name: Scalars['String'];
  primaryImage: Scalars['Int'];
  products: Array<Scalars['Int']>;
  projectId: Scalars['String'];
  projectImages: Array<Scalars['Int']>;
};

export type PortfolioItem = {
  __typename?: 'PortfolioItem';
  categories: Array<Category>;
  description: Scalars['String'];
  githubLinks?: Maybe<Array<Link>>;
  homeImage: ProjectImage;
  id: Scalars['Int'];
  links: Array<Link>;
  name: Scalars['String'];
  primaryImage: ProjectImage;
  productLinks?: Maybe<Array<Link>>;
  products: Array<Product>;
  projectId: Scalars['String'];
  projectImages: Array<ProjectImage>;
};

export type Product = {
  __typename?: 'Product';
  id: Scalars['Int'];
  name: Scalars['String'];
};

export type ProjectImage = {
  __typename?: 'ProjectImage';
  id: Scalars['Int'];
  imageUrl: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  categories: Array<Category>;
  linkTypes: Array<LinkType>;
  links: Array<Link>;
  marketSeries: Array<MarketSeries>;
  portfolioItems: Array<PortfolioItem>;
  products: Array<Product>;
  projectImages: Array<ProjectImage>;
  yieldCurve: YieldCurve;
};


export type QueryMarketSeriesArgs = {
  category?: InputMaybe<Scalars['String']>;
  from?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<Scalars['String']>>;
  to?: InputMaybe<Scalars['String']>;
};


export type QueryYieldCurveArgs = {
  date?: InputMaybe<Scalars['String']>;
};

export type YieldCurve = {
  __typename?: 'YieldCurve';
  comparisons: Array<YieldCurveComparison>;
  date: Scalars['String'];
  points: Array<YieldCurvePoint>;
};

export type YieldCurveComparison = {
  __typename?: 'YieldCurveComparison';
  date: Scalars['String'];
  key: Scalars['String'];
  label: Scalars['String'];
  points: Array<YieldCurvePoint>;
};

export type YieldCurvePoint = {
  __typename?: 'YieldCurvePoint';
  fredId: Scalars['String'];
  label: Scalars['String'];
  months: Scalars['Int'];
  value?: Maybe<Scalars['Float']>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  Category: ResolverTypeWrapper<Category>;
  CreatePortfolioItemResponse: ResolverTypeWrapper<CreatePortfolioItemResponse>;
  Float: ResolverTypeWrapper<Scalars['Float']>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  Link: ResolverTypeWrapper<Link>;
  LinkType: ResolverTypeWrapper<LinkType>;
  MarketObservation: ResolverTypeWrapper<MarketObservation>;
  MarketSeries: ResolverTypeWrapper<MarketSeriesResult>;
  Mutation: ResolverTypeWrapper<{}>;
  PortfolioItem: ResolverTypeWrapper<PortfolioItem>;
  Product: ResolverTypeWrapper<Product>;
  ProjectImage: ResolverTypeWrapper<ProjectImage>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']>;
  YieldCurve: ResolverTypeWrapper<YieldCurve>;
  YieldCurveComparison: ResolverTypeWrapper<YieldCurveComparison>;
  YieldCurvePoint: ResolverTypeWrapper<YieldCurvePoint>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean'];
  Category: Category;
  CreatePortfolioItemResponse: CreatePortfolioItemResponse;
  Float: Scalars['Float'];
  Int: Scalars['Int'];
  Link: Link;
  LinkType: LinkType;
  MarketObservation: MarketObservation;
  MarketSeries: MarketSeriesResult;
  Mutation: {};
  PortfolioItem: PortfolioItem;
  Product: Product;
  ProjectImage: ProjectImage;
  Query: {};
  String: Scalars['String'];
  YieldCurve: YieldCurve;
  YieldCurveComparison: YieldCurveComparison;
  YieldCurvePoint: YieldCurvePoint;
}>;

export type CategoryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CreatePortfolioItemResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CreatePortfolioItemResponse'] = ResolversParentTypes['CreatePortfolioItemResponse']> = ResolversObject<{
  code?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  portfolioItem?: Resolver<Maybe<ResolversTypes['PortfolioItem']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LinkResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Link'] = ResolversParentTypes['Link']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isInternal?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['LinkType'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LinkTypeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['LinkType'] = ResolversParentTypes['LinkType']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MarketObservationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['MarketObservation'] = ResolversParentTypes['MarketObservation']> = ResolversObject<{
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MarketSeriesResolvers<ContextType = Context, ParentType extends ResolversParentTypes['MarketSeries'] = ResolversParentTypes['MarketSeries']> = ResolversObject<{
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fredId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastFetchedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  latest?: Resolver<Maybe<ResolversTypes['MarketObservation']>, ParentType, ContextType>;
  observations?: Resolver<Array<ResolversTypes['MarketObservation']>, ParentType, ContextType>;
  previous?: Resolver<Maybe<ResolversTypes['MarketObservation']>, ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  createPortfolioItem?: Resolver<Maybe<ResolversTypes['CreatePortfolioItemResponse']>, ParentType, ContextType, RequireFields<MutationCreatePortfolioItemArgs, 'categories' | 'description' | 'homeImage' | 'links' | 'name' | 'primaryImage' | 'products' | 'projectId' | 'projectImages'>>;
}>;

export type PortfolioItemResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PortfolioItem'] = ResolversParentTypes['PortfolioItem']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  githubLinks?: Resolver<Maybe<Array<ResolversTypes['Link']>>, ParentType, ContextType>;
  homeImage?: Resolver<ResolversTypes['ProjectImage'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  links?: Resolver<Array<ResolversTypes['Link']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  primaryImage?: Resolver<ResolversTypes['ProjectImage'], ParentType, ContextType>;
  productLinks?: Resolver<Maybe<Array<ResolversTypes['Link']>>, ParentType, ContextType>;
  products?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectImages?: Resolver<Array<ResolversTypes['ProjectImage']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectImageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ProjectImage'] = ResolversParentTypes['ProjectImage']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  linkTypes?: Resolver<Array<ResolversTypes['LinkType']>, ParentType, ContextType>;
  links?: Resolver<Array<ResolversTypes['Link']>, ParentType, ContextType>;
  marketSeries?: Resolver<Array<ResolversTypes['MarketSeries']>, ParentType, ContextType, Partial<QueryMarketSeriesArgs>>;
  portfolioItems?: Resolver<Array<ResolversTypes['PortfolioItem']>, ParentType, ContextType>;
  products?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
  projectImages?: Resolver<Array<ResolversTypes['ProjectImage']>, ParentType, ContextType>;
  yieldCurve?: Resolver<ResolversTypes['YieldCurve'], ParentType, ContextType, Partial<QueryYieldCurveArgs>>;
}>;

export type YieldCurveResolvers<ContextType = Context, ParentType extends ResolversParentTypes['YieldCurve'] = ResolversParentTypes['YieldCurve']> = ResolversObject<{
  comparisons?: Resolver<Array<ResolversTypes['YieldCurveComparison']>, ParentType, ContextType>;
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  points?: Resolver<Array<ResolversTypes['YieldCurvePoint']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type YieldCurveComparisonResolvers<ContextType = Context, ParentType extends ResolversParentTypes['YieldCurveComparison'] = ResolversParentTypes['YieldCurveComparison']> = ResolversObject<{
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  points?: Resolver<Array<ResolversTypes['YieldCurvePoint']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type YieldCurvePointResolvers<ContextType = Context, ParentType extends ResolversParentTypes['YieldCurvePoint'] = ResolversParentTypes['YieldCurvePoint']> = ResolversObject<{
  fredId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  months?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  Category?: CategoryResolvers<ContextType>;
  CreatePortfolioItemResponse?: CreatePortfolioItemResponseResolvers<ContextType>;
  Link?: LinkResolvers<ContextType>;
  LinkType?: LinkTypeResolvers<ContextType>;
  MarketObservation?: MarketObservationResolvers<ContextType>;
  MarketSeries?: MarketSeriesResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PortfolioItem?: PortfolioItemResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProjectImage?: ProjectImageResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  YieldCurve?: YieldCurveResolvers<ContextType>;
  YieldCurveComparison?: YieldCurveComparisonResolvers<ContextType>;
  YieldCurvePoint?: YieldCurvePointResolvers<ContextType>;
}>;

