/**
 * 项目管理系统移动端APP
 * 主入口文件
 */
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import TasksScreen from './src/screens/TasksScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import ContractsScreen from './src/screens/ContractsScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ApprovalsScreen from './src/screens/ApprovalsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Projects: undefined;
  Tasks: {projectId: string};
  Customers: undefined;
  Contracts: undefined;
  Orders: undefined;
  Products: undefined;
  Messages: undefined;
  Approvals: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2563EB',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{title: '首页'}}
          />
          <Stack.Screen
            name="Projects"
            component={ProjectsScreen}
            options={{title: '项目管理'}}
          />
          <Stack.Screen
            name="Tasks"
            component={TasksScreen}
            options={({route}) => ({title: '任务详情'})}
          />
          <Stack.Screen
            name="Customers"
            component={CustomersScreen}
            options={{title: '客户管理'}}
          />
          <Stack.Screen
            name="Contracts"
            component={ContractsScreen}
            options={{title: '合同管理'}}
          />
          <Stack.Screen
            name="Orders"
            component={OrdersScreen}
            options={{title: '订单管理'}}
          />
          <Stack.Screen
            name="Products"
            component={ProductsScreen}
            options={{title: '产品管理'}}
          />
          <Stack.Screen
            name="Messages"
            component={MessagesScreen}
            options={{title: '消息中心'}}
          />
          <Stack.Screen
            name="Approvals"
            component={ApprovalsScreen}
            options={{title: '审批中心'}}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{title: '个人中心'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
