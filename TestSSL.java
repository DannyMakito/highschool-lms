public class TestSSL { public static void main(String[] args) throws Exception { javax.net.ssl.SSLContext ctx = javax.net.ssl.SSLContext.getDefault(); System.out.println(ctx.getProtocol()); } }  
