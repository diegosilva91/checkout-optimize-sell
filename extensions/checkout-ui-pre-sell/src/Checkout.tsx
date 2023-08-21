import {useEffect, useState } from "react";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  Banner,
  useApi,
  useTranslate,
  useApplyCartLinesChange,
  reactExtension,
  Divider,
  Image,
  Heading,
  Button,
  InlineLayout,
  BlockStack,
  Text,
  SkeletonText,
  SkeletonImage,
  useCartLines
} from '@shopify/ui-extensions-react/checkout';
import type { CartLineChangeResult,
  CartLineChange} from '@shopify/ui-extensions/checkout';
export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />,
);

function Extension() {
  const { query, i18n} = useApi();
  const [products, setProducts] = useState([]);
  const [adding, setAdding] = useState<boolean>(false);
  const [showError, setShowError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const applyCartLinesChange: (change: CartLineChange) =>Promise<CartLineChangeResult> = useApplyCartLinesChange();
  const lines = useCartLines();
  // [END product-offer-pre-purchase.retrieve-cart-data]

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  async function handleAddToCart(variantId) {
    setAdding(true);
    const result = await applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: variantId,
      quantity: 1,
    });
    setAdding(false);
    if (result.type === 'error') {
      setShowError(true);
      console.error(result.message);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data }:any = await query(
        `query ($first: Int!) {
          products(first: $first) {
            nodes {
              id
              title
              images(first:1){
                nodes {
                  url
                }
              }
              variants(first: 1) {
                nodes {
                  id
                  price {
                    amount
                  }
                }
              }
            }
          }
        }`,
        {
          variables: { first: 5 },
        }
      );
      console.log(data);
      if(data?.products)
      setProducts(data.products.nodes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!loading && products.length === 0) {
    return null;
  }

  const productsOnOffer = getProductsOnOffer(lines, products);

  if (!productsOnOffer.length) {
    return null;
  }

  return (
    <>
    <ProductOffer
      product={productsOnOffer[0]}
      i18n={i18n}
      adding={adding}
      handleAddToCart={handleAddToCart}
      showError={showError}
    />
    </>
  );
}

// [START product-offer-pre-purchase.loading-state]
function LoadingSkeleton() {
  const translate = useTranslate();
  return (
    <BlockStack spacing='loose'>
      <Divider />
      <Heading level={2}>{translate("youMightAlsoLike")}</Heading>
      <BlockStack spacing='loose'>
        <InlineLayout
          spacing='base'
          columns={[64, 'fill', 'auto']}
          blockAlignment='center'
        >
          <SkeletonImage aspectRatio={1} />
          <BlockStack spacing='none'>
            <SkeletonText inlineSize='large' />
            <SkeletonText inlineSize='small' />
          </BlockStack>
          <Button kind='secondary' disabled={true}>
            {translate("add")}
          </Button>
        </InlineLayout>
      </BlockStack>
    </BlockStack>
  );
}
// [END product-offer-pre-purchase.loading-state]

function getProductsOnOffer(lines, products) {
  const cartLineProductVariantIds = lines.map((item) => item.merchandise.id);
  return products.filter((product) => {
    const isProductVariantInCart = product.variants.nodes.some(({ id }) =>
      cartLineProductVariantIds.includes(id)
    );
    return !isProductVariantInCart;
  });
}

interface Props{
  product: any;
  i18n:any;
  adding:any;
  handleAddToCart:any;
  showError:boolean;
}
function ProductOffer({ product, i18n, adding, handleAddToCart, showError }: Props) {
  const { images, title, variants } = product;
  const renderPrice = i18n.formatCurrency(variants.nodes[0].price.amount);
  const imageUrl =
    images.nodes[0]?.url ??
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081';

  return (
    <BlockStack spacing='loose'>
      <Divider />
      <Heading level={2}>You might also like</Heading>
      <BlockStack spacing='loose'>
        <InlineLayout
          spacing='base'
          columns={[64, 'fill', 'auto']}
          blockAlignment='center'
        >
          <Image
            border='base'
            borderWidth='base'
            borderRadius='loose'
            source={imageUrl}
            aspectRatio={1}
          />
          <BlockStack spacing='none'>
            <Text size='medium' emphasis='bold'>
              {title}
            </Text>
            <Text appearance='subdued'>{renderPrice}</Text>
          </BlockStack>
          <Button
            kind='secondary'
            loading={adding}
            accessibilityLabel={`Add ${title} to cart`}
            onPress={() => handleAddToCart(variants.nodes[0].id)}
          >
            Add
          </Button>
        </InlineLayout>
      </BlockStack>
      {showError && <ErrorBanner />}
    </BlockStack>
  );
}

function ErrorBanner() {
  return (
    <Banner status='critical'>
      There was an issue adding this product. Please try again.
    </Banner>
  );
}