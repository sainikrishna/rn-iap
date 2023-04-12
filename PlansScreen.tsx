import React, { FC, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  Text,
  View
} from "react-native";
import {
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  type ProductPurchase,
  type PurchaseError,
  flushFailedPurchasesCachedAsPendingAndroid,
  SubscriptionPurchase,
  endConnection,
  requestSubscription,
  getSubscriptions,
  getAvailablePurchases,
  acknowledgePurchaseAndroid,
} from "react-native-iap";

const basicPlanId =
  Platform.OS == "ios" ? "basicPlanOneMonth" : "basicplan_one_month";
const proPlanId =
  Platform.OS == "ios" ? "proPlanOneMonth" : "proplan_one_month";

let purchaseUpdateSubscription = null as any;
let purchaseErrorSubscription = null as any;

// @ts-ignore
const LoginWithPhone: FC = ({ route, navigation }) => {
  const { isUpgradePlan, isDowngradePlan, onBack } = route?.params || {};
  const [activePlan, setActive] = useState('basicplan_one_month');
  const [products, setProducts] = useState([]);
  const [isPurchaseLoading, setPurchaseLoading] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState([]);
  const [prorationMode, setProrationMode] = useState();

 
  useEffect(() => {
    // if (isUpgradePlan || isDowngradePlan) {
      // setActive(isUpgradePlan ? proPlanId : basicPlanId);
      setTimeout(() => {
        getAvailablePurchases()
        .then((res: any) => {
          console.log("PlanScreen useEffect", res);
          if (res?.length) {
            setPurchasedItem(res);
          }
        })
        .catch((err) => {
          console.log("subscription err", { err });
        });
      }, 5000);
    // }
  }, [isUpgradePlan, isDowngradePlan]);

  const copyToClipboard = async (string = "") => {
  };

  useEffect(() => {
    const skus = Platform.select({
      ios: [proPlanId, basicPlanId],
      android: [proPlanId, basicPlanId],
    }) as any;

    initConnection().then(() => {
      getSubscriptions({ skus }).then((res: any) => {
        console.log("products", res);
        setProducts(res);
      });
      if (Platform.OS == "android") {
        flushFailedPurchasesCachedAsPendingAndroid()
          .catch(() => {
            // exception can happen here if:
            // - there are pending purchases that are still pending (we can't consume a pending purchase)
            // in any case, you might not want to do anything special with the error
          })
          .then(() => {
            purchaseUpdateSubscription = purchaseUpdatedListener(
              async (purchase: SubscriptionPurchase | ProductPurchase) => {
                console.log("purchaseUpdatedListener", purchase);
                setPurchaseLoading(false);
                if (purchase) {
                  Alert.alert("Success", JSON.stringify(purchase), [
                    {
                      text: "OK",
                      onPress: () => copyToClipboard(JSON.stringify(purchase)),
                    },
                  ]);
                  console.log("purchaseUpdatedListener", purchase);
                  acknowledgePurchaseAndroid({
                    token: purchase.purchaseToken || "",
                    developerPayload: purchase.developerPayloadAndroid,
                  })
                  // savePayment(purchase);
                }
              }
            );

            purchaseErrorSubscription = purchaseErrorListener(
              (error: PurchaseError) => {
                setPurchaseLoading(false);
                console.log("purchaseErrorListener", error);
                errorMsg(error);
              }
            );
          });
      }
    });

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription?.remove();
        purchaseUpdateSubscription = null;
      }

      if (purchaseErrorSubscription) {
        purchaseErrorSubscription?.remove();
        purchaseErrorSubscription = null;
      }
      endConnection();
    };
  }, []);

  const errorMsg = (err) => {
    if (err.code == "E_USER_CANCELLED") {
      Alert.alert("Error", "Payment is cancelled by user", [
        {
          text: "OK",
          onPress: () => copyToClipboard(JSON.stringify(err)),
        },
      ]);
      return;
    }
    if (err.code == "E_UNKNOWN") {
      Alert.alert("Error", "An unknown error occurred", [
        {
          text: "OK",
          onPress: () => copyToClipboard(JSON.stringify(err)),
        },
      ]);
      return;
    }
    if (err.code == "E_NOT_AVAILABLE") {
      Alert.alert("Error", "Item is not available for purchase", [
        {
          text: "OK",
          onPress: () => copyToClipboard(JSON.stringify(err)),
        },
      ]);
      return;
    }
    if (err.code == "E_ALREADY_OWNED") {
      Alert.alert("Error", "Item is already purchased", [
        {
          text: "OK",
          onPress: () => copyToClipboard(JSON.stringify(err)),
        },
      ]);
      return;
    }
    if (err.code == "E_ITEM_UNAVAILABLE") {
      Alert.alert(
        "Error",
        "Item is not available for purchase in your country",
        [
          {
            text: "OK",
            onPress: () => copyToClipboard(JSON.stringify(err)),
          },
        ]
      );
      return;
    }
    Alert.alert("Error", err.message, [
      {
        text: "OK",
        onPress: () => copyToClipboard(JSON.stringify(err)),
      },
    ]);
  };

  const onSubscribe = async () => {
    onUpgradeDowngradeSubscription();
    return;
    // if()

    const user = {_id: "krishan"};

    if (products?.length) {
      const product = products.find(
        (o: any) => o.productId == activePlan
      ) as any;
      const sku = product?.productId;

      // navigation.reset({
      //   index: 0,
      //   routes: [{ name: "Root" }],
      // });
      // return;

      setPurchaseLoading(true);
      if (Platform.OS == "ios") {
        try {
          await requestSubscription({
            sku,
            andDangerouslyFinishTransactionAutomaticallyIOS: false,
            appAccountToken: user._id,
          })
            .then((purchase) => {
              setPurchaseLoading(false);
              console.log("purchaseUpdatedListener", purchase);
              if (purchase) {
                // savePayment(purchase);
              }
            })
            .catch((err) => {
              console.log("subs err", { err });
              setPurchaseLoading(false);
              errorMsg(err);
            });
        } catch (err: any) {
          console.warn(err.code, err.message);
        }
      } else {
        const offerToken = product?.subscriptionOfferDetails[0]?.offerToken;
        try {
          // alert("called");
          console.log("onSubscribe", {sku, offerToken, user})
          // return;
          await requestSubscription({
            sku,
            subscriptionOffers: [{ sku, offerToken }],
            obfuscatedAccountIdAndroid: user._id,
          });
        } catch (err: any) {
          console.warn(err.code, err.message);
        }
      }
    }
  };

  const onUpgradeDowngradeSubscription = async () => {
    const product = products?.find(
      (o: any) => o.productId == activePlan
    ) as any;
    const sku = product?.productId;
    const offerToken = product?.subscriptionOfferDetails[0]?.offerToken;
    const user = {_id: "krishan"};
    const oldSubscription = purchasedItem.find(
      (o: any) => o.productId == (prorationMode == 2 ? "basicplan_one_month" : "proplan_one_month")
    ) as any;
    const data = {
      sku,
      subscriptionOffers: [{ sku, offerToken }],
      obfuscatedAccountIdAndroid: user._id,
      purchaseTokenAndroid: oldSubscription?.purchaseToken,
      prorationModeAndroid: prorationMode
      // prorationModeAndroid: 4 // Downgrade
      // prorationModeAndroid: 2 // Upgrade
    };
      console.log("onUpgradeDowngradeSubscription", data)
    try {
      await requestSubscription(data);
    } catch (err: any) {
      console.warn(err.code, err.message);
    }
  };

  return (
   <SafeAreaView style={{flex: 1}}>
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      {products.map(p => (
        <TouchableOpacity style={{backgroundColor: p.productId == activePlan ? 'red' : 'white', padding: 10, marginBottom: 10, borderRadius: 5}} onPress={() => setActive(p.productId)}>
          <Text style={{color: p.productId == activePlan ? 'white' : 'black'}}>{p.name}</Text>
        </TouchableOpacity>
      ))}
    <TouchableOpacity style={{padding: 10, marginVertical: 20, backgroundColor: 'blue', borderRadius: 10}} onPress={onSubscribe}>
      <Text style={{color: 'white'}}>Open Subscribe ({products.length})</Text>
    </TouchableOpacity>
    <TouchableOpacity style={{padding: 10, marginTop: 10, backgroundColor: prorationMode == 2 ? '#000080' : 'white', borderRadius: 10}} onPress={() => setProrationMode(2)}>
      <Text style={{color: prorationMode == 2 ? 'white' : 'black'}}>Upgrade</Text>
    </TouchableOpacity>
    <TouchableOpacity style={{padding: 10, marginTop: 10, backgroundColor: prorationMode == 4 ? '#000080' : 'white', borderRadius: 10}} onPress={() => setProrationMode(4)}>
      <Text style={{color: prorationMode == 4 ? 'white' : 'black'}}>Downgrade</Text>
    </TouchableOpacity>
    </View>
   
   </SafeAreaView>
  );
};

export default LoginWithPhone;
